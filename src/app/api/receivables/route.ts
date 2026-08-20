import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receivableSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");
    const status = searchParams.get("status");

    const where: Prisma.ReceivableWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;
    if (status === "PENDENTE" || status === "RECEBIDO" || status === "ATRASADO" || status === "CANCELADO") {
      where.status = status;
    }

    const receivables = await prisma.receivable.findMany({
      where,
      orderBy: { vencimento: "asc" },
    });

    return NextResponse.json(receivables);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar recebíveis" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = receivableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const receivable = await prisma.receivable.create({ data: parsed.data });
    return NextResponse.json(receivable, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao criar recebível" }, { status: 500 });
  }
}
