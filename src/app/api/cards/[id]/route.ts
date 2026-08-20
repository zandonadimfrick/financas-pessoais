import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cardUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar cartão" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = cardUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const card = await prisma.card.update({ where: { id }, data: parsed.data });
    return NextResponse.json(card);
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar cartão" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const transactionCount = await prisma.transaction.count({ where: { cardId: id } });
    if (transactionCount > 0) {
      const card = await prisma.card.update({
        where: { id },
        data: { arquivado: true },
      });
      return NextResponse.json({
        deleted: false,
        archived: true,
        message: `Cartão possui ${transactionCount} transação(ões) vinculada(s); marcado como arquivado em vez de excluído.`,
        card,
      });
    }

    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ deleted: true, archived: false, message: "Cartão excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir cartão" }, { status: 500 });
  }
}
