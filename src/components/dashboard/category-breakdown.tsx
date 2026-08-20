"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardCategoria } from "@/components/dashboard/types";

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DashboardCategoria }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="glass rounded-xl border border-border/50 bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="flex items-center gap-1.5 font-medium text-popover-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: item.cor }} />
        {item.nome}
      </p>
      <p className="font-numeric mt-1 text-muted-foreground">
        {formatCurrency(item.valor)} · {item.percentual.toString().replace(".", ",")}%
      </p>
    </div>
  );
}

interface CategoryBreakdownProps {
  porCategoria: DashboardCategoria[];
}

export function CategoryBreakdown({ porCategoria }: CategoryBreakdownProps) {
  const hasData = porCategoria.length > 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {!hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <PieChartIcon className="size-8 opacity-40" />
            <p className="text-sm">Nenhum gasto no período</p>
          </div>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porCategoria}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={500}
                  >
                    {porCategoria.map((entry) => (
                      <Cell key={entry.categoryId ?? entry.nome} fill={entry.cor} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="flex flex-col gap-2.5 overflow-y-auto">
              {porCategoria.map((item) => (
                <li
                  key={item.categoryId ?? item.nome}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="truncate text-foreground/90">{item.nome}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {item.percentual.toString().replace(".", ",")}%
                    </span>
                    <span className="font-numeric text-xs font-medium">
                      {formatCurrency(item.valor)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
