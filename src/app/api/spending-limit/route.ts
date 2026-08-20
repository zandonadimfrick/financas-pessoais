import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const schema = z.object({
  categoryId: z.string().min(1, "Selecione uma categoria"),
  // 0 remove o teto daquela categoria.
  valor: z.number().min(0, "O limite não pode ser negativo"),
});

function janelaDoMes(hoje = new Date()) {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100;
}

/**
 * Tetos de gasto por categoria e quanto já foi gasto em cada uma neste mês.
 *
 * O filtro de escopo (PF/PJ) continua valendo para o cálculo do gasto — quem
 * está olhando só o PJ não deve ver despesas pessoais no orçamento —, mas o
 * teto em si é da categoria, não do escopo.
 */
export async function GET(req: NextRequest) {
  try {
    const escopo = new URL(req.url).searchParams.get("escopo") ?? "ALL";
    const { inicio, fim } = janelaDoMes();

    const limites = await prisma.spendingLimit.findMany({
      include: { category: true },
    });

    if (limites.length === 0) {
      return NextResponse.json({
        configurado: false,
        categorias: [],
        totalLimite: 0,
        totalGasto: 0,
        estourou: false,
      });
    }

    const gastos = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        tipo: "SAIDA",
        efetivado: true,
        categoryId: { in: limites.map((l) => l.categoryId) },
        data: { gte: inicio, lte: fim },
        ...(escopo === "PF" || escopo === "PJ" ? { escopo } : {}),
      },
      _sum: { valor: true },
    });

    const gastoPorCategoria = new Map(
      gastos.map((g) => [g.categoryId, g._sum.valor ?? 0])
    );

    const categorias = limites
      .map((limite) => {
        const gasto = arredondar(gastoPorCategoria.get(limite.categoryId) ?? 0);
        const restante = arredondar(limite.valor - gasto);
        return {
          categoryId: limite.categoryId,
          nome: limite.category.nome,
          cor: limite.category.cor,
          limite: limite.valor,
          gasto,
          restante,
          percentual:
            limite.valor > 0
              ? Math.round((gasto / limite.valor) * 1000) / 10
              : 0,
          estourou: gasto > limite.valor,
        };
      })
      // Mais perto de estourar aparece primeiro — é o que precisa de atenção.
      .sort((a, b) => b.percentual - a.percentual);

    const totalLimite = arredondar(
      categorias.reduce((s, c) => s + c.limite, 0)
    );
    const totalGasto = arredondar(categorias.reduce((s, c) => s + c.gasto, 0));

    return NextResponse.json({
      configurado: true,
      categorias,
      totalLimite,
      totalGasto,
      estourou: categorias.some((c) => c.estourou),
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao ler os limites por categoria" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { categoryId, valor } = parsed.data;

    const categoria = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoria) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    if (valor === 0) {
      await prisma.spendingLimit.deleteMany({ where: { categoryId } });
      return NextResponse.json({ categoryId, valor: 0, removido: true });
    }

    const limite = await prisma.spendingLimit.upsert({
      where: { categoryId },
      create: { categoryId, valor },
      update: { valor },
      include: { category: true },
    });

    return NextResponse.json(limite);
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao salvar o limite" },
      { status: 500 }
    );
  }
}
