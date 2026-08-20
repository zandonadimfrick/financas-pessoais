"use client";

import Link from "next/link";
import { PieChart as PieChartIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CARD_LINK } from "@/components/dashboard/tone";
import type { DashboardCategoria } from "@/components/dashboard/types";

interface CategoryBreakdownProps {
  porCategoria: DashboardCategoria[];
  periodoLabel: string;
  className?: string;
}

/**
 * "Breakdown" de categorias no estilo da referência mobile: bolinha da cor da
 * categoria + nome + valor + percentual, com uma barra de progresso fina
 * embaixo. A lista rola dentro do card quando há muitas categorias.
 */
export function CategoryBreakdown({
  porCategoria,
  periodoLabel,
  className,
}: CategoryBreakdownProps) {
  const hasData = porCategoria.length > 0;
  const total = porCategoria.reduce((acc, item) => acc + item.valor, 0);

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
        <p className="text-xs text-muted-foreground">
          {periodoLabel} · {formatCurrency(total)}
        </p>
        <CardAction>
          <Link href="/transacoes" className={CARD_LINK}>
            Ver tudo
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        {!hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <PieChartIcon className="size-8 opacity-40" aria-hidden />
            <p className="text-sm">Nenhum gasto no período</p>
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-1">
            {porCategoria.map((item) => (
              <li key={item.categoryId ?? item.nome} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="truncate text-foreground/90">{item.nome}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="font-numeric text-sm font-semibold">
                      {formatCurrency(item.valor)}
                    </span>
                    <span className="font-numeric w-10 text-right text-xs text-muted-foreground">
                      {item.percentual.toString().replace(".", ",")}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max(item.percentual, 2)}%`,
                      backgroundColor: item.cor,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
