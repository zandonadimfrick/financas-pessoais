import { formatDateBR } from "@/lib/format";
import type { ResumoCartao, ResumoFatura, StatusFatura } from "@/lib/types";

const mesFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "2026-09" → "Setembro/2026". */
export function competenciaExtenso(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const nome = mesFormatter.format(new Date(ano, mes - 1, 1));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${ano}`;
}

/** Anda `delta` meses na competência ("2026-09", -1 → "2026-08"). */
export function competenciaVizinha(competencia: string, delta: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const ref = new Date(ano, mes - 1 + delta, 1);
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * As datas chegam em ISO UTC. Formatar só a parte "AAAA-MM-DD" evita o
 * escorregão de um dia que `new Date(iso).getDate()` causaria no fuso -03.
 */
export function dataBR(iso: string): string {
  return formatDateBR(iso.slice(0, 10));
}

/**
 * Formata um ISO que representa um INSTANTE, não uma data de calendário.
 *
 * O fechamento vem como fim do dia local (23:59:59.999) e o `pagoEm` como o
 * momento exato do clique — ambos "viram o dia" quando serializados em UTC
 * (01/09 23:59 local → "2026-09-02T03:59Z"). Aqui recortar a string erraria
 * em um dia, então o instante é lido no fuso local e só depois formatado.
 */
export function instanteBR(iso: string): string {
  const data = new Date(iso);
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return formatDateBR(`${data.getFullYear()}-${mes}-${dia}`);
}

/** Só dia/mês ("12/08"), para o período coberto pela fatura. */
export function diaMesBR(iso: string): string {
  return dataBR(iso).slice(0, 5);
}

/** Dia/mês de um instante (ex.: o fechamento do ciclo). */
export function diaMesInstanteBR(iso: string): string {
  return instanteBR(iso).slice(0, 5);
}

export function formatPercent(valor: number): string {
  return `${percentFormatter.format(valor)}%`;
}

/** Data de hoje em "AAAA-MM-DD" no fuso local (sem passar por UTC). */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Fatura não paga cujo vencimento já passou. */
export function faturaAtrasada(fatura: ResumoFatura): boolean {
  if (fatura.status === "PAGA" || fatura.total <= 0) return false;
  return fatura.vencimento.slice(0, 10) < hojeISO();
}

export const STATUS_FATURA_LABEL: Record<StatusFatura, string> = {
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  PAGA: "Paga",
};

/**
 * Qual fatura o botão "Pagar fatura" deve quitar: a mais antiga em aberto
 * (dívida mais urgente) e, na falta dela, a fatura atual se já tiver valor.
 */
export function faturaAPagar(resumo: ResumoCartao): ResumoFatura | null {
  const emAberto = resumo.faturasEmAberto.find((f) => f.total > 0);
  if (emAberto) return emAberto;
  const atual = resumo.faturaAtual;
  if (atual && atual.status !== "PAGA" && atual.total > 0) return atual;
  return null;
}

/**
 * Regra de cor da barra de limite — explícita de propósito:
 *   até 50%   → verde (`bg-income`): uso tranquilo
 *   50% a 80% → coral da marca (`bg-primary`): atenção
 *   80%+      → vermelho (`bg-destructive`): limite quase estourado
 */
export function corDoUso(percentual: number): string {
  if (percentual >= 80) return "bg-destructive";
  if (percentual >= 50) return "bg-primary";
  return "bg-income";
}
