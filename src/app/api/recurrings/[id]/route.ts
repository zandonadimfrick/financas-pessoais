import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recurringUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const recurring = await prisma.recurring.findUnique({ where: { id } });
    if (!recurring) {
      return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
    }
    return NextResponse.json(recurring);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar recorrência" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = recurringUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.recurring.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
    }

    const recurring = await prisma.recurring.update({ where: { id }, data: parsed.data });
    return NextResponse.json(recurring);
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar recorrência" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.recurring.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
    }

    const transactionCount = await prisma.transaction.count({ where: { recurringId: id } });
    if (transactionCount > 0) {
      const recurring = await prisma.recurring.update({
        where: { id },
        data: { ativo: false },
      });
      return NextResponse.json({
        deleted: false,
        archived: true,
        message: `Recorrência possui ${transactionCount} transação(ões) vinculada(s); marcada como inativa (ativo=false) em vez de excluída.`,
        recurring,
      });
    }

    await prisma.recurring.delete({ where: { id } });
    return NextResponse.json({ deleted: true, archived: false, message: "Recorrência excluída com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir recorrência" }, { status: 500 });
  }
}
