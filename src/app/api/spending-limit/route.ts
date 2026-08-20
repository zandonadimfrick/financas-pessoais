import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const ESCOPOS = ["PF", "PJ"] as const;
type EscopoConcreto = (typeof ESCOPOS)[number];

const schema = z.object({
  escopo: z.enum(ESCOPOS),
  // 0 remove o limite — é como o usuário "desliga" o alerta.
  valor: z.number().min(0, "O limite não pode ser negativo"),
});

function janelaDoMes(hoje = new Date()) {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { inicio, fim };
}

/**
 * Gasto do mês corrente x teto configurado.
 *
 * Com escopo "ALL" soma os dois orçamentos (PF + PJ); se só um deles estiver
 * configurado, o teto retornado é o desse — melhor mostrar um alerta parcial
 * do que nenhum.
 */
export async function GET(req: NextRequest) {
  try {
    const escopoParam = new URL(req.url).searchParams.get("escopo") ?? "ALL";
    const escopos: EscopoConcreto[] =
      escopoParam === "PF" || escopoParam === "PJ"
        ? [escopoParam]
        : [...ESCOPOS];

    const { inicio, fim } = janelaDoMes();

    const [limites, saidas] = await Promise.all([
      prisma.spendingLimit.findMany({ where: { escopo: { in: escopos } } }),
      prisma.transaction.findMany({
        where: {
          tipo: "SAIDA",
          efetivado: true,
          escopo: { in: escopos },
          data: { gte: inicio, lte: fim },
        },
        select: { valor: true },
      }),
    ]);

    const limite = limites.reduce((soma, l) => soma + l.valor, 0);
    const gasto = Math.round(saidas.reduce((s, t) => s + t.valor, 0) * 100) / 100;
    const restante = Math.round((limite - gasto) * 100) / 100;
    const percentual =
      limite > 0 ? Math.round((gasto / limite) * 1000) / 10 : 0;

    return NextResponse.json({
      escopo: escopoParam,
      // Sem limite configurado o cliente mostra só um convite pra definir um.
      configurado: limite > 0,
      limite,
      gasto,
      restante,
      percentual,
      estourou: limite > 0 && gasto > limite,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      porEscopo: limites.map((l) => ({ escopo: l.escopo, valor: l.valor })),
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao ler o limite de gastos" },
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

    const { escopo, valor } = parsed.data;

    if (valor === 0) {
      await prisma.spendingLimit.deleteMany({ where: { escopo } });
      return NextResponse.json({ escopo, valor: 0, removido: true });
    }

    const limite = await prisma.spendingLimit.upsert({
      where: { escopo },
      create: { escopo, valor },
      update: { valor },
    });

    return NextResponse.json(limite);
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao salvar o limite de gastos" },
      { status: 500 }
    );
  }
}
