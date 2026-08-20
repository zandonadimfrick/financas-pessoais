import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
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

    let buffer: Buffer;
    try {
      buffer = await readFile(resolveUploadPath(document.caminho));
    } catch {
      return NextResponse.json({ error: "Arquivo não encontrado no disco" }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.nomeArquivo}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao ler documento" }, { status: 500 });
  }
}
