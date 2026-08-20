"use client";

import { TrendingDown } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { formatCurrency, formatDateBR, formatWeekdayShortBR } from "@/lib/format";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import type { DashboardData, DashboardRange } from "@/components/dashboard/types";

function xAxisLabel(date: string, range: DashboardRange) {
  if (range === "week") return formatWeekdayShortBR(date);
  return formatDateBR(date).slice(0, 5);
}

const RANGE_SUBTITLE: Record<DashboardRange, string> = {
  day: "Últimos 14 dias",
  week: "Semana atual, dia a dia",
  month: "Mês atual, dia a dia",
};

interface MainChartProps {
  data: DashboardData;
  className?: string;
}

/**
 * Gráfico principal: barras arredondadas de entradas (verde) e saídas
 * (coral), lado a lado — o desenho de barras finas da referência. O dia de
 * maior gasto ganha uma barra em terracota (`--chart-4`) e é anunciado no
 * badge do cabeçalho.
 */
export function MainChart({ data, className }: MainChartProps) {
  const { series, range, peakSpendDay } = data;
  const compactXAxis = series.length > 10;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Entradas &amp; saídas</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{RANGE_SUBTITLE[range]}</span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-income" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-expense" />
            Saídas
          </span>
        </div>
        {peakSpendDay && (
          <CardAction>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
              <TrendingDown className="size-3.5 text-primary" aria-hidden />
              Maior gasto: {formatDateBR(peakSpendDay.date)} —{" "}
              <span className="font-numeric font-semibold">
                {formatCurrency(peakSpendDay.valor)}
              </span>
            </span>
          </CardAction>
        )}
      </CardHeader>

      {/*
        `min-h-*` + `flex-1` (em vez de `h-*`): o `flex-1` faz o gráfico
        preencher o card quando o card é esticado pela linha do grid, e o
        `min-h` impede que ele colapse pra zero no mobile, onde nada define a
        altura. `min-w-0` evita o clássico bug do ResponsiveContainer, que não
        encolhe junto com a coluna do grid.
      */}
      <CardContent className="min-h-64 min-w-0 flex-1 sm:min-h-72 2xl:min-h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => xAxisLabel(value, range)}
              interval={compactXAxis ? "preserveStartEnd" : 0}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={compactXAxis ? 24 : 8}
            />
            <YAxis
              tickFormatter={(value: number) =>
                value === 0 ? "0" : formatCurrency(value).replace("R$", "").trim()
              }
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)", radius: 12 }} />
            <Bar
              dataKey="entradas"
              fill="var(--income)"
              radius={6}
              maxBarSize={18}
              isAnimationActive
              animationDuration={500}
            />
            <Bar
              dataKey="saidas"
              radius={6}
              maxBarSize={18}
              isAnimationActive
              animationDuration={500}
            >
              {series.map((point) => (
                <Cell
                  key={point.date}
                  fill={
                    peakSpendDay && point.date === peakSpendDay.date
                      ? "var(--chart-4)"
                      : "var(--expense)"
                  }
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
