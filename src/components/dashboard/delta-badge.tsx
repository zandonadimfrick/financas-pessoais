"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pílula de variação percentual em relação ao período anterior.
 *
 * Contraste: o número é sempre `text-foreground` (ou `text-background` na
 * variante `onColor`), nunca verde/coral — verde `#16a34a` sobre branco dá
 * 3.3:1 e reprovaria no AA para texto pequeno. A cor fica só na seta, que é
 * um elemento gráfico (critério de 3:1) e é reforçada pela direção do ícone.
 */
interface DeltaBadgeProps {
  value: number | null | undefined;
  /** Para métricas onde subir é ruim (ex.: saídas): inverte o tom. */
  invert?: boolean;
  /**
   * `onColor` = pílula sólida escura/clara para usar sobre o hero coral ou
   * sobre o card preto, onde tinta translúcida não garantiria contraste.
   */
  tone?: "surface" | "onColor";
  className?: string;
}

export function DeltaBadge({
  value,
  invert = false,
  tone = "surface",
  className,
}: DeltaBadgeProps) {
  if (value === null || value === undefined) return null;

  const isUp = value > 0;
  const isFlat = value === 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  const surfaceClass =
    tone === "onColor"
      ? "bg-foreground text-background"
      : isFlat
        ? "bg-secondary text-foreground"
        : isGood
          ? "bg-income/12 text-foreground"
          : "bg-expense/12 text-foreground";

  const iconClass =
    tone === "surface" && !isFlat ? (isGood ? "text-income" : "text-expense") : undefined;

  return (
    <span
      className={cn(
        "font-numeric inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        surfaceClass,
        className
      )}
    >
      <Icon className={cn("size-3.5", iconClass)} aria-hidden />
      {Math.abs(value).toString().replace(".", ",")}%
      <span className="sr-only"> em relação ao período anterior</span>
    </span>
  );
}
