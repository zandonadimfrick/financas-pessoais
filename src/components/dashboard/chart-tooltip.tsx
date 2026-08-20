"use client";

import type { TooltipContentProps } from "recharts";

import { formatCurrency, formatDateLongBR } from "@/lib/format";

/**
 * Tooltip custom do gráfico principal, estilizado como card glass.
 * Recebe o payload padrão do Recharts (entradas/saidas por dia).
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0 || typeof label !== "string") return null;

  const entradas = payload.find((p) => p.dataKey === "entradas")?.value ?? 0;
  const saidas = payload.find((p) => p.dataKey === "saidas")?.value ?? 0;

  return (
    <div className="glass rounded-xl border border-border/50 bg-popover px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-popover-foreground">{formatDateLongBR(label)}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-income" />
            Entradas
          </span>
          <span className="font-numeric font-medium text-income">
            {formatCurrency(Number(entradas))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-expense" />
            Saídas
          </span>
          <span className="font-numeric font-medium text-expense">
            {formatCurrency(Number(saidas))}
          </span>
        </div>
      </div>
    </div>
  );
}
