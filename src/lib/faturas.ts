/**
 * Ciclos de fatura de cartão de crédito.
 *
 * Convenção usada (a mesma dos bancos brasileiros): a fatura de competência
 * "AAAA-MM" fecha no `diaFechamento` daquele mês e vence no `diaVencimento`.
 * Ela reúne as compras feitas no dia seguinte ao fechamento anterior até o
 * dia do fechamento, inclusive.
 *
 * Exemplo — fecha dia 5, vence dia 10:
 *   fatura 2026-08 → compras de 06/07 a 05/08, vencendo em 10/08.
 *
 * Se o vencimento cai antes do fechamento (ex: fecha 28, vence 5), o
 * vencimento é no mês seguinte ao fechamento.
 */

export interface CicloFatura {
  /** "AAAA-MM" — mês em que a fatura fecha. */
  competencia: string;
  /** Primeiro dia coberto pela fatura (00:00). */
  inicio: Date;
  /** Data do fechamento (fim do dia). */
  fechamento: Date;
  /** Data de vencimento (00:00). */
  vencimento: Date;
}

/** Ajusta o dia ao mês: dia 31 em fevereiro vira o último dia do mês. */
function diaValido(ano: number, mes: number, dia: number): Date {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimoDia));
}

function fimDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 23, 59, 59, 999);
}

export function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** Monta o ciclo da competência informada ("AAAA-MM"). */
export function cicloDaCompetencia(
  competencia: string,
  diaFechamento: number,
  diaVencimento: number
): CicloFatura {
  const [ano, mes] = competencia.split("-").map(Number);
  const indiceMes = mes - 1;

  const fechamento = fimDoDia(diaValido(ano, indiceMes, diaFechamento));

  // O ciclo começa no dia seguinte ao fechamento do mês anterior.
  const fechamentoAnterior = diaValido(ano, indiceMes - 1, diaFechamento);
  const inicio = new Date(
    fechamentoAnterior.getFullYear(),
    fechamentoAnterior.getMonth(),
    fechamentoAnterior.getDate() + 1
  );

  // Vencimento no mesmo mês do fechamento; se cair antes dele (cartão que
  // fecha no fim do mês e vence no início do seguinte), joga pro mês seguinte.
  let vencimento = diaValido(ano, indiceMes, diaVencimento);
  if (vencimento.getTime() <= fechamento.getTime() - 86_400_000) {
    vencimento = diaValido(ano, indiceMes + 1, diaVencimento);
  }

  return { competencia, inicio, fechamento, vencimento };
}

/** Descobre a que fatura pertence uma compra feita nesta data. */
export function cicloDaCompra(
  dataCompra: Date,
  diaFechamento: number,
  diaVencimento: number
): CicloFatura {
  const fechamentoDoMes = fimDoDia(
    diaValido(dataCompra.getFullYear(), dataCompra.getMonth(), diaFechamento)
  );

  // Comprou depois do fechamento deste mês? Cai na fatura do mês seguinte.
  const referencia =
    dataCompra.getTime() > fechamentoDoMes.getTime()
      ? new Date(dataCompra.getFullYear(), dataCompra.getMonth() + 1, 1)
      : new Date(dataCompra.getFullYear(), dataCompra.getMonth(), 1);

  return cicloDaCompetencia(
    competenciaDe(referencia),
    diaFechamento,
    diaVencimento
  );
}

/** Ciclo que está aberto agora (onde cai uma compra feita hoje). */
export function cicloAtual(
  diaFechamento: number,
  diaVencimento: number,
  hoje = new Date()
): CicloFatura {
  return cicloDaCompra(hoje, diaFechamento, diaVencimento);
}

/** Move para o ciclo anterior/seguinte ao informado. */
export function cicloVizinho(
  ciclo: CicloFatura,
  direcao: -1 | 1,
  diaFechamento: number,
  diaVencimento: number
): CicloFatura {
  const [ano, mes] = ciclo.competencia.split("-").map(Number);
  const referencia = new Date(ano, mes - 1 + direcao, 1);
  return cicloDaCompetencia(
    competenciaDe(referencia),
    diaFechamento,
    diaVencimento
  );
}

export function statusDoCiclo(
  ciclo: CicloFatura,
  paga: boolean,
  hoje = new Date()
): "ABERTA" | "FECHADA" | "PAGA" {
  if (paga) return "PAGA";
  return hoje.getTime() > ciclo.fechamento.getTime() ? "FECHADA" : "ABERTA";
}
