import { prisma } from "@/lib/prisma";
import {
  cicloAtual,
  cicloDaCompetencia,
  cicloDaCompra,
  cicloVizinho,
  statusDoCiclo,
  type CicloFatura,
} from "@/lib/faturas";

export interface ResumoFatura {
  competencia: string;
  inicio: string;
  fechamento: string;
  vencimento: string;
  status: "ABERTA" | "FECHADA" | "PAGA";
  total: number;
  quantidade: number;
  pagoEm: string | null;
  valorPago: number | null;
}

export interface ParcelaFutura {
  competencia: string;
  vencimento: string;
  total: number;
  quantidade: number;
}

export interface ResumoCartao {
  limite: number;
  /** Soma de tudo que ainda não foi pago — inclui as parcelas futuras. */
  utilizado: number;
  disponivel: number;
  /** 0 a 100, já limitado a 100 para a barra de progresso. */
  percentualUtilizado: number;
  faturaAtual: ResumoFatura | null;
  /** Faturas fechadas e ainda não pagas, da mais antiga para a mais recente. */
  faturasEmAberto: ResumoFatura[];
  /** Parcelas que cairão em faturas futuras, mês a mês. */
  parcelasFuturas: ParcelaFutura[];
  /** Soma de `parcelasFuturas` — o quanto do limite está preso no futuro. */
  totalFuturo: number;
}

function iso(data: Date): string {
  return data.toISOString();
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Soma as compras (saídas) do cartão dentro do ciclo. Estornos lançados como
 * ENTRADA no mesmo cartão abatem o total, que é como a fatura funciona de
 * verdade.
 */
async function totalDoCiclo(cardId: string, ciclo: CicloFatura) {
  const lancamentos = await prisma.transaction.findMany({
    where: {
      cardId,
      data: { gte: ciclo.inicio, lte: ciclo.fechamento },
    },
    select: { valor: true, tipo: true },
  });

  const total = lancamentos.reduce(
    (soma, t) => soma + (t.tipo === "SAIDA" ? t.valor : -t.valor),
    0
  );

  return { total: arredondar(total), quantidade: lancamentos.length };
}

function montarResumo(
  ciclo: CicloFatura,
  total: number,
  quantidade: number,
  registro: { status: string; pagoEm: Date | null; valorPago: number | null } | null,
  hoje: Date
): ResumoFatura {
  const paga = registro?.status === "PAGA";
  return {
    competencia: ciclo.competencia,
    inicio: iso(ciclo.inicio),
    fechamento: iso(ciclo.fechamento),
    vencimento: iso(ciclo.vencimento),
    status: statusDoCiclo(ciclo, paga, hoje),
    total,
    quantidade,
    pagoEm: registro?.pagoEm ? iso(registro.pagoEm) : null,
    valorPago: registro?.valorPago ?? null,
  };
}

/**
 * Monta o resumo de limite e faturas de um cartão.
 *
 * O limite é consumido por tudo que ainda não foi pago: a fatura aberta mais
 * as fechadas em aberto. Pagar uma fatura devolve aquele valor ao limite sem
 * mexer nas outras — é por isso que a fatura seguinte continua acumulando
 * normalmente depois do pagamento.
 */
export async function resumoDoCartao(
  card: { id: string; limite: number; diaFechamento: number; diaVencimento: number },
  hoje = new Date()
): Promise<ResumoCartao> {
  const atual = cicloAtual(card.diaFechamento, card.diaVencimento, hoje);

  const pagamentos = await prisma.cardInvoice.findMany({
    where: { cardId: card.id },
  });
  const porCompetencia = new Map(pagamentos.map((p) => [p.competencia, p]));

  const { total, quantidade } = await totalDoCiclo(card.id, atual);
  const faturaAtual = montarResumo(
    atual,
    total,
    quantidade,
    porCompetencia.get(atual.competencia) ?? null,
    hoje
  );

  // Volta ciclo a ciclo procurando faturas fechadas ainda não pagas. Doze
  // meses cobrem qualquer atraso realista sem varrer o histórico inteiro.
  const faturasEmAberto: ResumoFatura[] = [];
  let ciclo = atual;
  for (let i = 0; i < 12; i++) {
    ciclo = cicloVizinho(ciclo, -1, card.diaFechamento, card.diaVencimento);
    const registro = porCompetencia.get(ciclo.competencia) ?? null;
    if (registro?.status === "PAGA") continue;

    const soma = await totalDoCiclo(card.id, ciclo);
    if (soma.total <= 0) continue;

    faturasEmAberto.unshift(
      montarResumo(ciclo, soma.total, soma.quantidade, registro, hoje)
    );
  }

  /*
    Parcelas que caem em faturas futuras. Elas seguram o limite desde já: quem
    parcela R$ 2.000 em 10x tem os R$ 2.000 comprometidos na hora, e o limite
    volta de R$ 200 em R$ 200 conforme cada fatura é paga — como no banco.
  */
  const lancamentosFuturos = await prisma.transaction.findMany({
    where: { cardId: card.id, data: { gt: atual.fechamento } },
    select: { valor: true, tipo: true, data: true },
  });

  const porCicloFuturo = new Map<string, { total: number; quantidade: number }>();
  for (const lancamento of lancamentosFuturos) {
    const ciclo = cicloDaCompra(
      lancamento.data,
      card.diaFechamento,
      card.diaVencimento
    );
    const acumulado = porCicloFuturo.get(ciclo.competencia) ?? {
      total: 0,
      quantidade: 0,
    };
    acumulado.total += lancamento.tipo === "SAIDA" ? lancamento.valor : -lancamento.valor;
    acumulado.quantidade += 1;
    porCicloFuturo.set(ciclo.competencia, acumulado);
  }

  const parcelasFuturas: ParcelaFutura[] = [...porCicloFuturo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([competencia, { total, quantidade }]) => {
      const ciclo = cicloDaCompetencia(
        competencia,
        card.diaFechamento,
        card.diaVencimento
      );
      return {
        competencia,
        vencimento: iso(ciclo.vencimento),
        total: arredondar(total),
        quantidade,
      };
    });

  const totalFuturo = arredondar(
    parcelasFuturas.reduce((s, p) => s + p.total, 0)
  );

  const utilizado = arredondar(
    faturasEmAberto.reduce((s, f) => s + f.total, 0) +
      (faturaAtual.status === "PAGA" ? 0 : faturaAtual.total) +
      totalFuturo
  );

  const disponivel = arredondar(Math.max(card.limite - utilizado, 0));
  const percentualUtilizado =
    card.limite > 0
      ? Math.min(arredondar((utilizado / card.limite) * 100), 100)
      : 0;

  return {
    limite: card.limite,
    utilizado,
    disponivel,
    percentualUtilizado,
    faturaAtual,
    faturasEmAberto,
    parcelasFuturas,
    totalFuturo,
  };
}

/** Lista as compras de uma competência específica, para o extrato da fatura. */
export async function lancamentosDaFatura(
  card: { id: string; diaFechamento: number; diaVencimento: number },
  competencia: string
) {
  const ciclo = cicloDaCompetencia(
    competencia,
    card.diaFechamento,
    card.diaVencimento
  );

  const lancamentos = await prisma.transaction.findMany({
    where: {
      cardId: card.id,
      data: { gte: ciclo.inicio, lte: ciclo.fechamento },
    },
    include: { category: true },
    orderBy: { data: "desc" },
  });

  return { ciclo, lancamentos };
}
