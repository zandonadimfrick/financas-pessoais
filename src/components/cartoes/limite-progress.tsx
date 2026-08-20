"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { corDoUso, formatPercent } from "@/components/cartoes/fatura-utils";

/**
 * Barra de uso do limite do cartão. A largura é animada com framer-motion
 * para o valor mudar suavemente quando o resumo é recarregado (ex.: depois
 * de pagar uma fatura, quando o limite volta).
 */
export function LimiteProgress({
  percentual,
  className,
}: {
  /** 0 a 100. */
  percentual: number;
  className?: string;
}) {
  const pct = Math.min(Math.max(percentual, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Limite utilizado: ${formatPercent(pct)}`}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      <motion.div
        className={cn("h-full rounded-full", corDoUso(pct))}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
