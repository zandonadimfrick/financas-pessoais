import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/validations";
import { resumoDoCartao } from "@/lib/cartoes";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");
    // `resumo=1` agrega limite e faturas — mais caro, então só quando pedido.
    const comResumo = searchParams.get("resumo") === "1";

    const where: Prisma.CardWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;

    const cards = await prisma.card.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    if (!comResumo) return NextResponse.json(cards);

    const comDados = await Promise.all(
      cards.map(async (card) => ({
        ...card,
        resumo: await resumoDoCartao(card),
      }))
    );

    return NextResponse.json(comDados);
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
