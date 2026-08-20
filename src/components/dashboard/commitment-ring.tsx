"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

interface CommitmentRingProps {
  entradas: number;
  saidas: number;
  periodoLabel: string;
  className?: string;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Card escuro com anel de progresso — o equivalente honesto ao card preto
 * "36% growth rate" da referência: mostra a **taxa de comprometimento da
 * renda** do período (`saídas ÷ entradas`).
 *
 * Sem entradas no período não existe taxa: o card mostra "—" em vez de
 * dividir por zero ou inventar um número.
 *
 * Cores: `bg-foreground text-background` inverte o card em ambos os temas
 * (preto/quase-branco no claro, creme/quase-preto no escuro). O anel usa o
 * coral da marca no claro e um coral mais profundo no escuro — sobre o creme
 * do tema escuro o `--primary` claro ficaria em 1.9:1, abaixo dos 3:1
 * exigidos para elemento gráfico.
 */
export function CommitmentRing({ entradas, saidas, periodoLabel, className }: CommitmentRingProps) {
  const hasEntradas = entradas > 0;
  const pct = hasEntradas ? (saidas / entradas) * 100 : null;
  const ratio = pct === null ? 0 : Math.min(Math.max(pct / 100, 0), 1);
  const dashOffset = CIRCUMFERENCE * (1 - ratio);
  const pctLabel = pct === null ? "—" : `${Math.round(pct)}%`;

  return (
    <Card
      className={cn("justify-center bg-foreground text-background ring-foreground/15", className)}
    >
      <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="relative size-24 shrink-0 sm:size-28">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              className="text-background/20"
              stroke="currentColor"
            />
            {pct !== null && (
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                stroke="currentColor"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="text-primary transition-[stroke-dashoffset] duration-700 ease-out dark:text-[#c2410c]"
              />
            )}
          </svg>
          <span className="font-numeric absolute inset-0 grid place-items-center text-xl font-semibold sm:text-2xl">
            {pctLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase">Comprometimento</p>
          <p className="text-sm leading-snug font-medium">
            {pct === null
              ? `Sem entradas registradas ${periodoLabel.toLowerCase()} — não dá para calcular a taxa.`
              : "das entradas do período foram comprometidas com saídas."}
          </p>
          {pct !== null && (
            <p className="font-numeric text-xs">
              {formatCurrency(saidas)} de {formatCurrency(entradas)}
              {pct > 100 && " · gastou mais do que entrou"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
