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
