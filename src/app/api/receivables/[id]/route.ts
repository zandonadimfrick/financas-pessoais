import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receivableUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const receivable = await prisma.receivable.findUnique({ where: { id } });
    if (!receivable) {
      return NextResponse.json({ error: "Recebível não encontrado" }, { status: 404 });
    }
    return NextResponse.json(receivable);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar recebível" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = receivableUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.receivable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recebível não encontrado" }, { status: 404 });
    }

    const receivable = await prisma.receivable.update({ where: { id }, data: parsed.data });
    return NextResponse.json(receivable);
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar recebível" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.receivable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recebível não encontrado" }, { status: 404 });
    }

    await prisma.receivable.delete({ where: { id } });
    return NextResponse.json({ deleted: true, message: "Recebível excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir recebível" }, { status: 500 });
  }
}
