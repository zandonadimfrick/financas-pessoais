import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }
    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar conta" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = accountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const account = await prisma.account.update({ where: { id }, data: parsed.data });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar conta" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const transactionCount = await prisma.transaction.count({ where: { accountId: id } });
    if (transactionCount > 0) {
      const account = await prisma.account.update({
        where: { id },
        data: { arquivada: true },
      });
      return NextResponse.json({
        deleted: false,
        archived: true,
        message: `Conta possui ${transactionCount} transação(ões) vinculada(s); marcada como arquivada em vez de excluída.`,
        account,
      });
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ deleted: true, archived: false, message: "Conta excluída com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir conta" }, { status: 500 });
  }
}
