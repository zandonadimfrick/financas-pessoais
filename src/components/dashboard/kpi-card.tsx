"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAnimatedCurrency } from "@/hooks/use-animated-currency";

type Tone = "income" | "expense" | "accent" | "neutral";

const toneClasses: Record<Tone, string> = {
  income: "text-income",
  expense: "text-expense",
  accent: "text-gradient-accent",
  neutral: "text-foreground",
};

interface KpiCardProps {
  label: string;
  value: number;
  tone: Tone;
  icon: LucideIcon;
  deltaPct?: number | null;
  /** Para deltas onde "subir" é ruim (ex: saídas), inverte a cor do badge. */
  invertDeltaColor?: boolean;
  hint?: string;
}

export function KpiCard({
  label,
  value,
  tone,
  icon: Icon,
  deltaPct,
  invertDeltaColor = false,
  hint,
}: KpiCardProps) {
  const display = useAnimatedCurrency(value);

  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const isPositive = hasDelta && deltaPct! >= 0;
  const isGood = invertDeltaColor ? !isPositive : isPositive;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent/60">
            <Icon className={cn("size-4", toneClasses[tone])} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <span
            className={cn(
              "font-numeric text-2xl font-semibold tracking-tight sm:text-3xl 2xl:text-4xl",
              toneClasses[tone]
            )}
          >
            {display}
          </span>

          {hasDelta && (
            <span
              className={cn(
                "mb-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                isGood ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(deltaPct!).toString().replace(".", ",")}%
            </span>
          )}
        </div>

        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
