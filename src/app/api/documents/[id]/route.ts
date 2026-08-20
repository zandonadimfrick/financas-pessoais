import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(document);
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar documento" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });

    try {
      await unlink(resolveUploadPath(document.caminho));
    } catch {
      // arquivo já pode não existir em disco; ignora
    }

    return NextResponse.json({ deleted: true, message: "Documento excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro interno ao excluir documento" }, { status: 500 });
  }
}
