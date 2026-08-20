"use client";

import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";

import { formatCurrency, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";

export function RecentTransactions() {
  const { items, isLoading, error } = useRecentTransactions(8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas transações</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
            <Receipt className="size-7 opacity-40" />
            <p className="text-sm">Nenhuma transação registrada ainda</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((t) => {
              const isIncome = t.tipo === "ENTRADA";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/50"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
                      )}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownLeft className="size-4" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-foreground/90">{t.descricao}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t.category?.nome ?? "Sem categoria"} · {formatDateBR(t.data.slice(0, 10))}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-numeric shrink-0 text-sm font-medium",
                      isIncome ? "text-income" : "text-expense"
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
