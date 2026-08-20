import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");

    const where: Prisma.AccountWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar contas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const account = await prisma.account.create({ data: parsed.data });
    return NextResponse.json(account, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao criar conta" }, { status: 500 });
  }
}
