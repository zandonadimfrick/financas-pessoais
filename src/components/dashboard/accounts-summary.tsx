"use client";

import { Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardConta } from "@/components/dashboard/types";

interface AccountsSummaryProps {
  contas: DashboardConta[];
}

export function AccountsSummary({ contas }: AccountsSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas</CardTitle>
      </CardHeader>
      <CardContent>
        {contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
            <Wallet className="size-7 opacity-40" />
            <p className="text-sm">Nenhuma conta cadastrada</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {contas.map((conta) => (
              <li
                key={conta.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/50"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: conta.cor }}
                  />
                  <span className="truncate text-sm text-foreground/90">{conta.nome}</span>
                </span>
                <span
                  className={cn(
                    "font-numeric shrink-0 text-sm font-medium",
                    conta.saldoAtual < 0 ? "text-expense" : "text-foreground"
                  )}
                >
                  {formatCurrency(conta.saldoAtual)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
