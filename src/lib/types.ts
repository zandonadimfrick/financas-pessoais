// Tipos "DTO" das entidades como chegam pelo `fetch().json()` das rotas de
// API (datas já serializadas como string ISO, diferente dos tipos do
// Prisma). Compartilhados entre as páginas de CRUD que referenciam a mesma
// entidade (ex.: Cartões referencia Account, Transações referencia
// Category/Account/Card).

export type Escopo = "PF" | "PJ";
export type TipoConta = "CORRENTE" | "POUPANCA" | "INVESTIMENTO" | "CARTEIRA";
export type TipoLancamento = "ENTRADA" | "SAIDA";
export type Periodicidade = "DIARIA" | "SEMANAL" | "MENSAL" | "ANUAL";
export type StatusRecebivel = "PENDENTE" | "RECEBIDO" | "ATRASADO" | "CANCELADO";
export type TipoDocumento = "NOTA_FISCAL" | "COMPROVANTE" | "OUTRO";

export interface Account {
  id: string;
  nome: string;
  instituicao: string;
  tipo: TipoConta;
  escopo: Escopo;
  saldoInicial: number;
  cor: string;
  icone: string | null;
  arquivada: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  nome: string;
  instituicao: string;
  escopo: Escopo;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  arquivado: boolean;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StatusFatura = "ABERTA" | "FECHADA" | "PAGA";

/** Uma fatura (ciclo) do cartão, como vem no `resumo` de `GET /api/cards?resumo=1`. */
export interface ResumoFatura {
  competencia: string;
  inicio: string;
  fechamento: string;
  vencimento: string;
  status: StatusFatura;
  total: number;
  quantidade: number;
  pagoEm: string | null;
  valorPago: number | null;
}

/** Uma parcela que ainda vai cair em fatura futura. */
export interface ParcelaFutura {
  competencia: string;
  vencimento: string;
  total: number;
  quantidade: number;
}

/** Agregado de limite + faturas de um cartão. */
export interface ResumoCartao {
  limite: number;
  /** Soma do que ainda não foi pago — o que está segurando o limite. */
  utilizado: number;
  disponivel: number;
  /** 0 a 100, já limitado a 100 pela API. */
  percentualUtilizado: number;
  faturaAtual: ResumoFatura | null;
  /** Faturas fechadas e não pagas, da mais antiga para a mais recente. */
  faturasEmAberto: ResumoFatura[];
  /**
   * Parcelas agendadas para faturas futuras. Opcionais no cliente porque a
   * tela precisa continuar funcionando se a API ainda não devolver o campo.
   */
  parcelasFuturas?: ParcelaFutura[];
  totalFuturo?: number;
  /** Assinaturas ativas cobradas neste cartão. */
  assinaturas?: AssinaturaDoCartao[];
  /** Quanto do limite some todo mês só com assinaturas. */
  totalAssinaturasMensal?: number;
}

/** Assinatura recorrente cobrada num cartão. */
export interface AssinaturaDoCartao {
  id: string;
  nome: string;
  valor: number;
  periodicidade: string;
  diaCobranca: number;
  valorMensal: number;
  categoria: { nome: string; cor: string } | null;
}

export interface CardComResumo extends Card {
  resumo: ResumoCartao;
}

/**
 * Lançamento como vem no extrato da fatura. A rota inclui só `category`
 * (sem `account`/`card`/`recurringId`), por isso não reusa `Transaction`.
 */
export interface FaturaLancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  data: string;
  escopo: Escopo;
  observacao: string | null;
  efetivado: boolean;
  categoryId: string | null;
  category: Category | null;
  accountId: string | null;
  cardId: string | null;
  /** Número desta parcela (ex.: 3) — `null` quando a compra não é parcelada. */
  parcela?: number | null;
  /** Total de parcelas da compra (ex.: 10). */
  parcelasTotal?: number | null;
  /** Valor cheio da compra parcelada. */
  valorTotal?: number | null;
  /** Mesmo id em todas as parcelas da mesma compra. */
  compraId?: string | null;
}

/** Resposta de `GET /api/cards/{id}/faturas/{competencia}`. */
export interface ExtratoFatura {
  cartao: { id: string; nome: string; cor: string };
  competencia: string;
  inicio: string;
  fechamento: string;
  vencimento: string;
  status: StatusFatura;
  total: number;
  pagoEm: string | null;
  valorPago: number | null;
  lancamentos: FaturaLancamento[];
}

/** Resposta de POST/DELETE em `…/faturas/{competencia}/pagar`. */
export interface PagamentoFaturaResponse {
  paga: boolean;
  valorPago?: number;
  resumo: ResumoCartao | null;
}

export interface Category {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  essencial: boolean;
  cor: string;
  icone: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  data: string;
  escopo: Escopo;
  observacao: string | null;
  efetivado: boolean;
  categoryId: string | null;
  category: Category | null;
  accountId: string | null;
  account: Account | null;
  cardId: string | null;
  card: Card | null;
  recurringId: string | null;
  /** Parcelamento — nulos quando a compra é à vista. */
  compraId: string | null;
  parcela: number | null;
  parcelasTotal: number | null;
  valorTotal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Recurring {
  id: string;
  nome: string;
  valor: number;
  tipo: TipoLancamento;
  periodicidade: Periodicidade;
  diaCobranca: number;
  escopo: Escopo;
  ativo: boolean;
  proximaCobranca: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: StatusRecebivel;
  escopo: Escopo;
  pagador: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  tipo: TipoDocumento;
  nomeArquivo: string;
  caminho: string;
  mimeType: string;
  tamanho: number;
  escopo: Escopo;
  competencia: string;
  observacao: string | null;
  transactionId: string | null;
  createdAt: string;
}

/** Resposta de DELETE de entidades que arquivam em vez de excluir quando há vínculos. */
export interface ArchiveOnDeleteResponse {
  deleted: boolean;
  archived: boolean;
  message: string;
}
