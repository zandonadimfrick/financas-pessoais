"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAnimatedCurrency } from "@/hooks/use-animated-currency";
import { DeltaBadge } from "@/components/dashboard/delta-badge";

type Tone = "income" | "expense";

const TONE_TEXT: Record<Tone, string> = {
  income: "text-income",
  expense: "text-expense",
};

const TONE_ICON: Record<Tone, string> = {
  income: "bg-income/12 text-income",
  expense: "bg-expense/12 text-expense",
};

interface MetricCardProps {
  label: string;
  value: number;
  tone: Tone;
  icon: LucideIcon;
  deltaPct?: number | null;
  /** Para métricas onde subir é ruim (ex.: saídas). */
  invertDelta?: boolean;
  /** Texto da pílula de período (Hoje / Semana / Mês). */
  periodLabel: string;
  className?: string;
}

/**
 * Card de métrica no estilo da referência: ícone em círculo à esquerda,
 * rótulo pequeno, pílula de período à direita, valor grande colorido embaixo
 * e a variação vs. período anterior.
 *
 * O valor usa `text-income`/`text-expense` em tamanho grande (≥ 24px), faixa
 * em que 3:1 basta para o AA — o texto pequeno do badge fica neutro.
 */
export function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
  deltaPct,
  invertDelta = false,
  periodLabel,
  className,
}: MetricCardProps) {
  const display = useAnimatedCurrency(value);

  return (
    <Card className={cn("justify-between", className)}>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE_ICON[tone])}
          >
            <Icon className="size-4.5" />
          </span>
          <span className="truncate text-sm font-medium text-muted-foreground">{label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {periodLabel}
        </span>
      </CardContent>

      <CardContent className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "font-numeric text-2xl leading-none font-semibold tracking-tight sm:text-3xl 2xl:text-4xl",
            TONE_TEXT[tone]
          )}
        >
          {display}
        </span>
        <DeltaBadge value={deltaPct} invert={invertDelta} className="mb-0.5" />
      </CardContent>
    </Card>
  );
}
