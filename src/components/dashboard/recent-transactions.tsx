"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";

import { formatCurrency, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_LINK, moneyToneSmall } from "@/components/dashboard/tone";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";

interface RecentTransactionsProps {
  limit?: number;
  className?: string;
}

/**
 * Lista das últimas transações no formato da referência mobile: ícone
 * circular, descrição, categoria/data em cinza e o valor colorido à direita.
 */
export function RecentTransactions({ limit = 6, className }: RecentTransactionsProps) {
  const { items, isLoading, error } = useRecentTransactions(limit);

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader>
        <CardTitle>Últimas transações</CardTitle>
        <p className="text-xs text-muted-foreground">Independente do período selecionado</p>
        <CardAction>
          <Link href="/transacoes" className={CARD_LINK}>
            Ver tudo
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <Receipt className="size-7 opacity-40" aria-hidden />
            <p className="text-sm">Nenhuma transação registrada ainda</p>
            <Link href="/transacoes" className={CARD_LINK}>
              Registrar a primeira
            </Link>
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {items.map((t) => {
              const isIncome = t.tipo === "ENTRADA";
              return (
                <li key={t.id}>
                  <div className="flex items-center justify-between gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-secondary">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full",
                          isIncome ? "bg-income/12 text-income" : "bg-expense/12 text-expense"
                        )}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="size-4.5" />
                        ) : (
                          <ArrowDownLeft className="size-4.5" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground/90">
                          {t.descricao}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {t.category?.nome ?? "Sem categoria"} ·{" "}
                          {formatDateBR(t.data.slice(0, 10))}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-numeric shrink-0 text-sm font-semibold",
                        moneyToneSmall(isIncome)
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(t.valor)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
