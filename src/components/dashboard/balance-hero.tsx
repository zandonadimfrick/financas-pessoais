"use client";

import Link from "next/link";
import { Plus, Wallet2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useAnimatedCurrency } from "@/hooks/use-animated-currency";
import { DeltaBadge } from "@/components/dashboard/delta-badge";

interface BalanceHeroProps {
  /** Soma dos saldos atuais de todas as contas (não é do período). */
  total: number;
  contasCount: number;
  /** Saldo do período selecionado (entradas − saídas). */
  saldoPeriodo: number;
  deltaSaldoPct: number | null;
  periodoLabel: string;
  className?: string;
}

/**
 * Card hero coral — o elemento mais alto da hierarquia do painel e, no
 * mobile, o primeiro bloco da tela (igual à referência).
 *
 * Sobre a cor: o coral da marca (`--primary` = `#e8593f`) dá só 3.54:1 com
 * texto branco, o que reprova no AA para texto normal. No tema claro o card
 * usa uma variação mais profunda do mesmo coral (`#cf4322` ≈ 4.7:1 com
 * branco); no escuro o `--primary` claro com `--primary-foreground` quase
 * preto já passa folgado (≈ 6:1), então basta `dark:bg-primary`. Em ambos os
 * casos o texto é `text-primary-foreground`, sem opacidade — nada de
 * `text-white/70` aqui, que derrubaria o contraste.
 */
export function BalanceHero({
  total,
  contasCount,
  saldoPeriodo,
  deltaSaldoPct,
  periodoLabel,
  className,
}: BalanceHeroProps) {
  const display = useAnimatedCurrency(total);

  return (
    <section
      aria-labelledby="saldo-total-label"
      className={cn(
        "flex min-h-[15rem] flex-col justify-between gap-6 rounded-2xl bg-[#cf4322] p-5 text-primary-foreground sm:p-6 dark:bg-primary",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          id="saldo-total-label"
          className="text-[0.7rem] font-semibold tracking-[0.16em] uppercase"
        >
          Saldo total nas contas
        </p>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-black/20"
        >
          <Wallet2 className="size-4.5" />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="font-numeric text-4xl leading-none font-semibold tracking-tight sm:text-5xl 2xl:text-6xl">
            {display}
          </p>
          <DeltaBadge value={deltaSaldoPct} tone="onColor" className="mb-0.5" />
        </div>
        <p className="text-sm font-medium">
          {contasCount === 1 ? "1 conta ativa" : `${contasCount} contas ativas`} · {periodoLabel}:{" "}
          {formatCurrency(saldoPeriodo)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/transacoes"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-background/60"
        >
          <Plus className="size-4" aria-hidden />
          Nova transação
        </Link>
        <Link
          href="/contas"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-card px-4 text-sm font-semibold text-foreground ring-1 ring-black/10 transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-background/60"
        >
          <Wallet2 className="size-4" aria-hidden />
          Ver contas
        </Link>
      </div>
    </section>
  );
}
