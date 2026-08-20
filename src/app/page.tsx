"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";

import { formatDateBR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CommitmentRing } from "@/components/dashboard/commitment-ring";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { MainChart } from "@/components/dashboard/main-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { TopCategoriesRings } from "@/components/dashboard/top-categories-rings";
import { ExpenseHeatmap } from "@/components/dashboard/expense-heatmap";
import { AccountsSummary } from "@/components/dashboard/accounts-summary";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { DashboardRange } from "@/components/dashboard/types";

const RANGE_TABS: { value: DashboardRange; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

/** Rótulo curto para as pílulas de período dentro dos cards. */
const RANGE_PILL: Record<DashboardRange, string> = {
  day: "Hoje",
  week: "Semana",
  month: "Mês",
};

/** Rótulo em frase, usado nos subtítulos ("Neste mês · R$ ..."). */
const RANGE_PHRASE: Record<DashboardRange, string> = {
  day: "Hoje",
  week: "Nesta semana",
  month: "Neste mês",
};

function EmptyPeriod({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-secondary">
          <PiggyBank className="size-5 text-muted-foreground" />
        </span>
        <p className="font-heading text-base font-medium">Nenhuma transação neste período</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Troque a aba de período acima ou registre uma transação para ver o gráfico e a
          distribuição por categoria.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Painel em mosaico "bento": cards de tamanhos diferentes dentro de um único
 * grid (1 coluna no mobile, 2 no tablet, 4 no desktop), com o hero coral de
 * saldo ocupando 2×2 no canto superior esquerdo.
 *
 * Nada de `min-h-screen` aqui: quem rola é o `<main>` do shell.
 */
export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("month");
  const { data, isLoading, isFetching, error } = useDashboardData(range);

  const contasTotal = data?.contasResumo.reduce((acc, conta) => acc + conta.saldoAtual, 0) ?? 0;
  const hasActivity = data ? data.totals.entradas > 0 || data.totals.saidas > 0 : false;
  const periodoIntervalo = data
    ? data.windowStart === data.windowEnd
      ? formatDateBR(data.windowStart)
      : `${formatDateBR(data.windowStart)} – ${formatDateBR(data.windowEnd)}`
    : null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Visão geral</h2>
          <p className="text-xs text-muted-foreground">
            {periodoIntervalo ?? "Carregando período…"}
            {isFetching && data ? " · atualizando…" : ""}
          </p>
        </div>

        <Tabs value={range} onValueChange={(value) => setRange(value as DashboardRange)}>
          <TabsList className="rounded-full bg-secondary p-1">
            {RANGE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full px-4 data-active:bg-foreground data-active:text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:text-background"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error && !data ? (
        <DashboardError message={error} />
      ) : data ? (
        <motion.div
          animate={{ opacity: isFetching ? 0.6 : 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4"
        >
          {/* Bloco superior: hero 2×2 + duas métricas + o anel de comprometimento */}
          <BalanceHero
            className="md:col-span-2 xl:row-span-2"
            total={contasTotal}
            contasCount={data.contasResumo.length}
            saldoPeriodo={data.totals.saldo}
            deltaSaldoPct={data.deltaPct.saldo}
            periodoLabel={RANGE_PHRASE[range]}
          />

          <QuickActions className="md:hidden" />

          <MetricCard
            label="Entradas"
            value={data.totals.entradas}
            tone="income"
            icon={TrendingUp}
            deltaPct={data.deltaPct.entradas}
            periodLabel={RANGE_PILL[range]}
          />
          <MetricCard
            label="Saídas"
            value={data.totals.saidas}
            tone="expense"
            icon={TrendingDown}
            deltaPct={data.deltaPct.saidas}
            invertDelta
            periodLabel={RANGE_PILL[range]}
          />

          <CommitmentRing
            className="md:col-span-2"
            entradas={data.totals.entradas}
            saidas={data.totals.saidas}
            periodoLabel={RANGE_PHRASE[range]}
          />

          {/* Bloco do meio: gráfico largo + breakdown alto e estreito */}
          {hasActivity ? (
            <>
              <MainChart data={data} className="md:col-span-2 xl:col-span-3" />
              <CategoryBreakdown
                porCategoria={data.porCategoria}
                periodoLabel={RANGE_PHRASE[range]}
                className="md:col-span-2 xl:col-span-1"
              />
            </>
          ) : (
            <EmptyPeriod className="md:col-span-2 xl:col-span-4" />
          )}

          <ExpenseHeatmap className="md:col-span-2 xl:col-span-4" />

          {/* Bloco inferior: círculos concêntricos + contas + transações */}
          <TopCategoriesRings porCategoria={data.porCategoria} periodoLabel={RANGE_PHRASE[range]} />
          <AccountsSummary contas={data.contasResumo} />
          <RecentTransactions className="md:col-span-2" />
        </motion.div>
      ) : null}
    </div>
  );
}
