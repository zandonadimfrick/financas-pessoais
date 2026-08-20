"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CARD_LINK, MONEY_SMALL_EXPENSE } from "@/components/dashboard/tone";
import type { DashboardConta } from "@/components/dashboard/types";

interface AccountsSummaryProps {
  contas: DashboardConta[];
  className?: string;
}

export function AccountsSummary({ contas, className }: AccountsSummaryProps) {
  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader>
        <CardTitle>Contas</CardTitle>
        <p className="text-xs text-muted-foreground">Saldo atual de cada conta</p>
        <CardAction>
          <Link href="/contas" className={CARD_LINK}>
            Ver tudo
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        {contas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <Wallet className="size-7 opacity-40" aria-hidden />
            <p className="text-sm">Nenhuma conta cadastrada</p>
            <Link href="/contas" className={CARD_LINK}>
              Cadastrar conta
            </Link>
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {contas.map((conta) => (
              <li key={conta.id}>
                <div className="flex items-center justify-between gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-secondary">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full"
                      style={{
                        backgroundColor: `${conta.cor}22`,
                        color: conta.cor,
                      }}
                    >
                      <Wallet className="size-4" />
                    </span>
                    <span className="truncate text-sm font-medium text-foreground/90">
                      {conta.nome}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-numeric shrink-0 text-sm font-semibold",
                      conta.saldoAtual < 0 ? MONEY_SMALL_EXPENSE : "text-foreground"
                    )}
                  >
                    {formatCurrency(conta.saldoAtual)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
