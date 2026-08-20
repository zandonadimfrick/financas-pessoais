import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");

    const where: Prisma.CardWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;

    const cards = await prisma.card.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(cards);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar cartões" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const card = await prisma.card.create({ data: parsed.data });
    return NextResponse.json(card, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao criar cartão" }, { status: 500 });
  }
}
