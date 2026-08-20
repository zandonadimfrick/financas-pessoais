"use client";

import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardCategoria } from "@/components/dashboard/types";

const BOX = 200;
const MAX_RADIUS = 94;
/** Distância mínima entre raios vizinhos, para os rótulos nunca colidirem. */
const MIN_GAP = 24;
const MIN_RADIUS = 18;

const compactMil = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactUnidade = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** "R$ 4,2 mil" acima de mil; abaixo disso o valor inteiro ("R$ 981"). */
function compactCurrency(valor: number) {
  return valor >= 1000 ? compactMil.format(valor) : compactUnidade.format(valor);
}

interface TopCategoriesRingsProps {
  porCategoria: DashboardCategoria[];
  periodoLabel: string;
  className?: string;
}

/**
 * Círculos concêntricos com as maiores categorias de gasto do período — a
 * releitura do card "Annual profits" da referência com dado real.
 *
 * A área de cada círculo é proporcional ao valor (raio ∝ √valor), e os raios
 * são espaçados à força quando ficam próximos demais, para os rótulos não se
 * sobreporem.
 *
 * Todos os círculos usam o MESMO coral da marca com opacidade crescente rumo
 * ao centro (bem lavado por fora, sólido no menor), como na referência — o
 * degradê é o que comunica intensidade. A cor de cada categoria continua
 * aparecendo na bolinha da lista logo abaixo, então nada de informação se
 * perde.
 */
/** Opacidade do preenchimento por posição, do círculo maior para o menor. */
const FILL_OPACITY = [0.1, 0.22, 0.42, 1];
export function TopCategoriesRings({
  porCategoria,
  periodoLabel,
  className,
}: TopCategoriesRingsProps) {
  const top = porCategoria.filter((c) => c.valor > 0).slice(0, 4);
  const maxValor = top[0]?.valor ?? 0;

  const rings: { item: DashboardCategoria; radius: number }[] = [];
  for (const [index, item] of top.entries()) {
    const raw = maxValor > 0 ? MAX_RADIUS * Math.sqrt(item.valor / maxValor) : MAX_RADIUS;
    const previous = rings[index - 1]?.radius ?? Number.POSITIVE_INFINITY;
    const radius = Math.max(MIN_RADIUS, Math.min(raw, previous - MIN_GAP));
    rings.push({ item, radius });
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-4 text-muted-foreground" aria-hidden />
          Maiores gastos
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodoLabel}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {rings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <Layers className="size-7 opacity-40" aria-hidden />
            <p className="text-sm">Nenhum gasto categorizado no período</p>
          </div>
        ) : (
          <>
            <div className="relative mx-auto w-full max-w-[13rem]">
              {/* Puramente visual: a lista abaixo é a versão acessível do mesmo dado. */}
              <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full" aria-hidden>
                {rings.map(({ item, radius }, index) => {
                  // Alinha a rampa de opacidade ao fim do array: com menos de
                  // 4 categorias, o menor círculo continua sendo o sólido.
                  const opacity =
                    FILL_OPACITY[FILL_OPACITY.length - rings.length + index] ?? 1;
                  return (
                    <circle
                      key={item.categoryId ?? item.nome}
                      cx={BOX / 2}
                      cy={BOX - radius - 4}
                      r={radius}
                      fill="var(--primary)"
                      fillOpacity={opacity}
                    />
                  );
                })}
              </svg>

              {rings.map(({ item, radius }, index) => {
                const ehSolido = index === rings.length - 1;
                return (
                  <span
                    key={item.categoryId ?? item.nome}
                    className={cn(
                      "font-numeric absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.72rem] font-semibold",
                      // Sobre o círculo sólido o texto precisa ser claro; sobre
                      // os lavados, um coral escuro para fechar contraste.
                      ehSolido
                        ? "text-primary-foreground"
                        : "text-[var(--chart-4)] dark:text-primary"
                    )}
                    style={{
                      top: `${((BOX - 2 * radius - 4 + 16) / BOX) * 100}%`,
                    }}
                  >
                    {compactCurrency(item.valor)}
                  </span>
                );
              })}
            </div>

            <ul className="flex flex-col gap-2">
              {rings.map(({ item }) => (
                <li
                  key={item.categoryId ?? item.nome}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="truncate text-foreground/90">{item.nome}</span>
                  </span>
                  <span className="font-numeric shrink-0 text-xs font-medium text-muted-foreground">
                    {formatCurrency(item.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
