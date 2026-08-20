"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, PiggyBank, TrendingDown, TrendingUp, Wallet2 } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MainChart } from "@/components/dashboard/main-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
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

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("month");
  const { data, isLoading, isFetching, error } = useDashboardData(range);

  const contasTotal =
    data?.contasResumo.reduce((acc, conta) => acc + conta.saldoAtual, 0) ?? 0;
  const hasActivity = data ? data.totals.entradas > 0 || data.totals.saidas > 0 : false;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={range} onValueChange={(value) => setRange(value as DashboardRange)}>
        <TabsList>
          {RANGE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error && !data ? (
        <DashboardError message={error} />
      ) : data ? (
        <motion.div
          animate={{ opacity: isFetching ? 0.6 : 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-col gap-6 xl:gap-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5 2xl:gap-6">
            <KpiCard
              label="Entradas"
              value={data.totals.entradas}
              tone="income"
              icon={TrendingUp}
              deltaPct={data.deltaPct.entradas}
            />
            <KpiCard
              label="Saídas"
              value={data.totals.saidas}
              tone="expense"
              icon={TrendingDown}
              deltaPct={data.deltaPct.saidas}
              invertDeltaColor
            />
            <KpiCard
              label="Saldo do período"
              value={data.totals.saldo}
              tone={data.totals.saldo >= 0 ? "income" : "expense"}
              icon={ArrowLeftRight}
              deltaPct={data.deltaPct.saldo}
            />
            <KpiCard
              label="Saldo total nas contas"
              value={contasTotal}
              tone={contasTotal >= 0 ? "accent" : "expense"}
              icon={Wallet2}
              hint={`${data.contasResumo.length} conta(s)`}
            />
          </div>

          {!hasActivity ? (
            <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card py-16 text-center text-muted-foreground">
              <PiggyBank className="size-8 opacity-40" />
              <p className="text-sm">Nenhuma transação neste período</p>
              <p className="text-xs">Troque a aba ou registre uma transação para ver o gráfico</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5 2xl:gap-6">
              <div className="lg:col-span-2">
                <MainChart data={data} />
              </div>
              <CategoryBreakdown porCategoria={data.porCategoria} />
            </div>
          )}

          <ExpenseHeatmap />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-5 2xl:grid-cols-3 2xl:gap-6">
            <AccountsSummary contas={data.contasResumo} />
            <div className="2xl:col-span-2">
              <RecentTransactions />
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
