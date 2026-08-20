"use client";

import { TrendingDown } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDateBR, formatWeekdayShortBR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import type { DashboardData, DashboardRange } from "@/components/dashboard/types";

const INCOME_HEX = "#34d399";
const EXPENSE_HEX = "#fb7185";

function xAxisLabel(date: string, range: DashboardRange) {
  if (range === "week") return formatWeekdayShortBR(date);
  return formatDateBR(date).slice(0, 5);
}

interface MainChartProps {
  data: DashboardData;
}

export function MainChart({ data }: MainChartProps) {
  const { series, range, peakSpendDay } = data;
  const compactXAxis = series.length > 10;

  return (
    <Card className="flex-1">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>Entradas &amp; saídas</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-income" />
              Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-expense" />
              Saídas
            </span>
          </div>
        </div>
        {peakSpendDay && (
          <div className="flex items-center gap-2 rounded-full bg-expense/10 px-3 py-1 text-xs font-medium text-expense">
            <TrendingDown className="size-3.5" />
            Maior gasto: {formatDateBR(peakSpendDay.date)} — {formatCurrency(peakSpendDay.valor)}
          </div>
        )}
      </CardHeader>
      <CardContent className="h-72 sm:h-80 2xl:h-[26rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INCOME_HEX} stopOpacity={0.35} />
                <stop offset="95%" stopColor={INCOME_HEX} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE_HEX} stopOpacity={0.35} />
                <stop offset="95%" stopColor={EXPENSE_HEX} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => xAxisLabel(value, range)}
              interval={compactXAxis ? "preserveStartEnd" : 0}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
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
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
            <Area
              type="monotone"
              dataKey="entradas"
              stroke={INCOME_HEX}
              strokeWidth={2.5}
              fill="url(#fillEntradas)"
              dot={series.length <= 31 ? { r: 2.5, fill: INCOME_HEX, strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: INCOME_HEX, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="saidas"
              stroke={EXPENSE_HEX}
              strokeWidth={2.5}
              fill="url(#fillSaidas)"
              dot={series.length <= 31 ? { r: 2.5, fill: EXPENSE_HEX, strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: EXPENSE_HEX, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
            {peakSpendDay && (
              <ReferenceDot
                x={peakSpendDay.date}
                y={peakSpendDay.valor}
                r={5}
                fill={EXPENSE_HEX}
                stroke="var(--card)"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
