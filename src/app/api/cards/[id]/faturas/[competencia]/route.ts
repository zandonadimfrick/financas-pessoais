import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lancamentosDaFatura } from "@/lib/cartoes";
import { statusDoCiclo } from "@/lib/faturas";

type Params = { params: Promise<{ id: string; competencia: string }> };

const COMPETENCIA = /^\d{4}-\d{2}$/;

/** Extrato da fatura: o que foi comprado no ciclo, com totais. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id, competencia } = await params;
    if (!COMPETENCIA.test(competencia)) {
      return NextResponse.json(
        { error: "Competência inválida. Use o formato AAAA-MM." },
        { status: 400 }
      );
    }

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const { ciclo, lancamentos } = await lancamentosDaFatura(card, competencia);
    const registro = await prisma.cardInvoice.findUnique({
      where: { cardId_competencia: { cardId: id, competencia } },
    });

    const total =
      Math.round(
        lancamentos.reduce(
          (soma, t) => soma + (t.tipo === "SAIDA" ? t.valor : -t.valor),
          0
        ) * 100
      ) / 100;

    return NextResponse.json({
      cartao: { id: card.id, nome: card.nome, cor: card.cor },
      competencia,
      inicio: ciclo.inicio.toISOString(),
      fechamento: ciclo.fechamento.toISOString(),
      vencimento: ciclo.vencimento.toISOString(),
      status: statusDoCiclo(ciclo, registro?.status === "PAGA"),
      total,
      pagoEm: registro?.pagoEm?.toISOString() ?? null,
      valorPago: registro?.valorPago ?? null,
      lancamentos,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao ler a fatura" }, { status: 500 });
  }
}
