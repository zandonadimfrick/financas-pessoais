import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recurringSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const escopo = searchParams.get("escopo");

    const where: Prisma.RecurringWhereInput = {};
    if (escopo === "PF" || escopo === "PJ") where.escopo = escopo;

    const recurrings = await prisma.recurring.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(recurrings);
  } catch {
    return NextResponse.json({ error: "Erro interno ao listar recorrências" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = recurringSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const recurring = await prisma.recurring.create({ data: parsed.data });
    return NextResponse.json(recurring, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao criar recorrência" }, { status: 500 });
  }
}
