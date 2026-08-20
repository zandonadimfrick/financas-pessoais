import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cicloDaCompetencia } from "@/lib/faturas";
import { lancamentosDaFatura, resumoDoCartao } from "@/lib/cartoes";

type Params = { params: Promise<{ id: string; competencia: string }> };

const COMPETENCIA = /^\d{4}-\d{2}$/;

/**
 * Marca a fatura como paga, devolvendo o valor ao limite disponível.
 *
 * Não gera lançamento novo de propósito: as compras do cartão já entraram
 * como saída quando foram registradas. Criar uma saída também no pagamento
 * contaria o mesmo dinheiro duas vezes nos relatórios.
 */
export async function POST(_req: NextRequest, { params }: Params) {
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

    const { lancamentos } = await lancamentosDaFatura(card, competencia);
    const total =
      Math.round(
        lancamentos.reduce(
          (soma, t) => soma + (t.tipo === "SAIDA" ? t.valor : -t.valor),
          0
        ) * 100
      ) / 100;

    if (total <= 0) {
      return NextResponse.json(
        { error: "Esta fatura não tem valor a pagar." },
        { status: 409 }
      );
    }

    const ciclo = cicloDaCompetencia(
      competencia,
      card.diaFechamento,
      card.diaVencimento
    );

    await prisma.cardInvoice.upsert({
      where: { cardId_competencia: { cardId: id, competencia } },
      create: {
        cardId: id,
        competencia,
        fechamento: ciclo.fechamento,
        vencimento: ciclo.vencimento,
        status: "PAGA",
        pagoEm: new Date(),
        valorPago: total,
      },
      update: {
        status: "PAGA",
        pagoEm: new Date(),
        valorPago: total,
      },
    });

    return NextResponse.json({
      paga: true,
      valorPago: total,
      resumo: await resumoDoCartao(card),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao pagar a fatura" }, { status: 500 });
  }
}

/** Desfaz o pagamento — útil quando marcado por engano. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id, competencia } = await params;

    const registro = await prisma.cardInvoice.findUnique({
      where: { cardId_competencia: { cardId: id, competencia } },
    });
    if (!registro) {
      return NextResponse.json(
        { error: "Esta fatura não está marcada como paga." },
        { status: 404 }
      );
    }

    await prisma.cardInvoice.update({
      where: { id: registro.id },
      data: { status: "FECHADA", pagoEm: null, valorPago: null },
    });

    const card = await prisma.card.findUnique({ where: { id } });
    return NextResponse.json({
      paga: false,
      resumo: card ? await resumoDoCartao(card) : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao desfazer o pagamento" },
      { status: 500 }
    );
  }
}
