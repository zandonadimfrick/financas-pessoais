"use client";

import type { TooltipContentProps } from "recharts";

import { formatCurrency, formatDateLongBR } from "@/lib/format";
import { MONEY_SMALL_EXPENSE, MONEY_SMALL_INCOME } from "@/components/dashboard/tone";

/**
 * Tooltip do gráfico principal — mesmo desenho dos cards: superfície chapada,
 * canto bem arredondado e um ring sutil em vez de sombra pesada.
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
    <div className="rounded-2xl bg-popover px-3.5 py-3 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10">
      <p className="mb-2 font-medium">{formatDateLongBR(label)}</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className="size-2 rounded-full bg-income" />
            Entradas
          </span>
          <span className={`font-numeric font-semibold ${MONEY_SMALL_INCOME}`}>
            {formatCurrency(Number(entradas))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className="size-2 rounded-full bg-expense" />
            Saídas
          </span>
          <span className={`font-numeric font-semibold ${MONEY_SMALL_EXPENSE}`}>
            {formatCurrency(Number(saidas))}
          </span>
        </div>
      </div>
    </div>
  );
}
