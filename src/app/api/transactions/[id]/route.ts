import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true, account: true, card: true },
    });
    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar transação" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: parsed.data,
      include: { category: true, account: true, card: true },
    });
    return NextResponse.json(transaction);
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar transação" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    /*
      Numa compra parcelada, apagar uma parcela sozinha deixaria a compra
      inconsistente (e o limite do cartão errado). Por isso `?compra=1` apaga
      todas as parcelas de uma vez — quem chama decide, e a interface pergunta.
    */
    const apagarCompraToda =
      new URL(req.url).searchParams.get("compra") === "1" && !!existing.compraId;

    if (apagarCompraToda) {
      const { count } = await prisma.transaction.deleteMany({
        where: { compraId: existing.compraId },
      });
      return NextResponse.json({
        deleted: true,
        parcelasExcluidas: count,
        message: `Compra parcelada excluída (${count} parcelas).`,
      });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ deleted: true, message: "Transação excluída com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir transação" }, { status: 500 });
  }
}
