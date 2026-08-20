export type DashboardRange = "day" | "week" | "month";
export type Scope = "PF" | "PJ" | "ALL";

export interface DashboardTotals {
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface DashboardSeriesPoint {
  date: string;
  entradas: number;
  saidas: number;
}

export interface DashboardCategoria {
  categoryId: string | null;
  nome: string;
  cor: string;
  valor: number;
  percentual: number;
}

export interface DashboardConta {
  id: string;
  nome: string;
  cor: string;
  saldoAtual: number;
}

export interface DashboardData {
  range: DashboardRange;
  scope: Scope;
  anchorDate: string;
  windowStart: string;
  windowEnd: string;
  totals: DashboardTotals;
  previousTotals: DashboardTotals;
  deltaPct: {
    entradas: number | null;
    saidas: number | null;
    saldo: number | null;
  };
  series: DashboardSeriesPoint[];
  peakSpendDay: { date: string; valor: number } | null;
  porCategoria: DashboardCategoria[];
  contasResumo: DashboardConta[];
}

export type HeatmapGranularity = "day" | "month" | "year";

export interface HeatmapBucket {
  key: string;
  label: string;
  valor: number;
  level: number;
}

export interface HeatmapData {
  granularity: HeatmapGranularity;
  year: number | null;
  scope: Scope;
  min: number;
  max: number;
  availableYears: number[];
  buckets: HeatmapBucket[];
}

export interface TransactionListItem {
  id: string;
  descricao: string;
  valor: number;
  tipo: "ENTRADA" | "SAIDA";
  data: string;
  escopo: Scope;
  category: { id: string; nome: string; cor: string } | null;
  account: { id: string; nome: string; cor: string } | null;
  card: { id: string; nome: string; cor: string } | null;
}
