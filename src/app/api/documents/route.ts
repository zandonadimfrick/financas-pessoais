import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { documentUploadSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");
    const tipo = searchParams.get("tipo");
    const competencia = searchParams.get("competencia");
    const transactionId = searchParams.get("transactionId");

    const where: Prisma.DocumentWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;
    if (tipo === "NOTA_FISCAL" || tipo === "COMPROVANTE" || tipo === "OUTRO") where.tipo = tipo;
    if (competencia) where.competencia = competencia;
    if (transactionId) where.transactionId = transactionId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar documentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo 'file' é obrigatório" }, { status: 400 });
    }

    const parsed = documentUploadSchema.safeParse({
      tipo: formData.get("tipo"),
      escopo: formData.get("escopo"),
      competencia: formData.get("competencia"),
      observacao: formData.get("observacao"),
      transactionId: formData.get("transactionId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use pdf, jpg, jpeg, png ou webp." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Arquivo excede o tamanho máximo de 15MB" }, { status: 400 });
    }

    const { tipo, escopo, competencia, observacao, transactionId } = parsed.data;

    const relativeDir = path.join("uploads", escopo, competencia);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });

    const uuid = crypto.randomUUID();
    const safeName = sanitizeFileName(file.name);
    const fileName = `${uuid}-${safeName}`;
    const relativePath = path.join(relativeDir, fileName);
    const absolutePath = path.join(absoluteDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    const document = await prisma.document.create({
      data: {
        tipo,
        escopo,
        competencia,
        observacao: observacao ?? null,
        transactionId: transactionId ?? null,
        nomeArquivo: file.name,
        caminho: relativePath,
        mimeType: file.type,
        tamanho: file.size,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao enviar documento" }, { status: 500 });
  }
}
