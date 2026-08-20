import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const tipo = searchParams.get("tipo");
    const escopo = searchParams.get("escopo");
    const categoryId = searchParams.get("categoryId");
    const accountId = searchParams.get("accountId");
    const cardId = searchParams.get("cardId");

    const where: Prisma.TransactionWhereInput = {};

    if (from || to) {
      where.data = {};
      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return NextResponse.json({ error: "Parâmetro 'from' inválido" }, { status: 400 });
        }
        where.data.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return NextResponse.json({ error: "Parâmetro 'to' inválido" }, { status: 400 });
        }
        where.data.lte = toDate;
      }
    }

    if (tipo === "ENTRADA" || tipo === "SAIDA") where.tipo = tipo;
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (cardId) where.cardId = cardId;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { data: "desc" },
      include: { category: true, account: true, card: true },
    });

    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar transações" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { parcelas = 1, ...dados } = parsed.data;

    if (parcelas === 1) {
      const transaction = await prisma.transaction.create({
        data: dados,
        include: { category: true, account: true, card: true },
      });
      return NextResponse.json(transaction, { status: 201 });
    }

    if (!dados.cardId) {
      return NextResponse.json(
        { error: "Parcelamento só é possível em compras no cartão." },
        { status: 400 }
      );
    }

    /*
      Divide o total em N parcelas mensais. Centavos que não fecham na divisão
      vão para a PRIMEIRA parcela — é o que os bancos fazem, e garante que a
      soma das parcelas seja exatamente o valor da compra.
    */
    const totalCentavos = Math.round(dados.valor * 100);
    const base = Math.floor(totalCentavos / parcelas);
    const sobra = totalCentavos - base * parcelas;

    const primeiraData = new Date(dados.data);
    const compraId = crypto.randomUUID();

    /*
      Tudo em UTC de propósito. A data chega como "AAAA-MM-DD" e vira meia-noite
      UTC; ler isso com os métodos locais (`getDate()`) devolveria o dia
      anterior no Brasil e a parcela cairia um dia antes do que o usuário
      escolheu. Fixar 12:00 UTC também mantém o mesmo dia em qualquer fuso.
    */
    const lancamentos = Array.from({ length: parcelas }, (_, i) => {
      // Mantém o dia da compra nos meses seguintes; dia 31 em mês curto cai
      // no último dia daquele mês em vez de vazar para o mês seguinte.
      const ano = primeiraData.getUTCFullYear();
      const mes = primeiraData.getUTCMonth() + i;
      const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      const data = new Date(
        Date.UTC(ano, mes, Math.min(primeiraData.getUTCDate(), ultimoDia), 12)
      );

      return {
        ...dados,
        data,
        valor: (base + (i === 0 ? sobra : 0)) / 100,
        descricao: `${dados.descricao} (${i + 1}/${parcelas})`,
        compraId,
        parcela: i + 1,
        parcelasTotal: parcelas,
        valorTotal: dados.valor,
      };
    });

    await prisma.transaction.createMany({ data: lancamentos });

    const criadas = await prisma.transaction.findMany({
      where: { compraId },
      include: { category: true, account: true, card: true },
      orderBy: { parcela: "asc" },
    });

    return NextResponse.json(criadas, { status: 201 });
  } catch (erro) {
    console.error("[POST /api/transactions]", erro);
    return NextResponse.json({ error: "Erro interno ao criar transação" }, { status: 500 });
  }
}
