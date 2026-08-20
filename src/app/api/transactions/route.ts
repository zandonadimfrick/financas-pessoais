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

    const transaction = await prisma.transaction.create({
      data: parsed.data,
      include: { category: true, account: true, card: true },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao criar transação" }, { status: 500 });
  }
}
