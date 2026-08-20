"use client";

import * as React from "react";
import { CalendarClock, Receipt } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CardComResumo, ParcelaFutura } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  competenciaExtenso,
  dataBR,
} from "@/components/cartoes/fatura-utils";

/** Quantos meses a projeção mostra antes de pedir "ver todas". */
const MESES_VISIVEIS = 6;

/**
 * Projeção das próximas faturas: quanto já está comprometido mês a mês pelas
 * compras parceladas. As mini-barras são proporcionais ao maior mês, para dar
 * a leitura de "onde o aperto vai ser maior" sem precisar comparar números.
 */
export function ParcelasFuturasDialog({
  card,
  onOpenChange,
  onVerCompras,
}: {
  card: CardComResumo;
  onOpenChange: (open: boolean) => void;
  onVerCompras: (competencia: string) => void;
}) {
  const [verTodas, setVerTodas] = React.useState(false);

  const parcelas: ParcelaFutura[] = card.resumo.parcelasFuturas ?? [];
  const totalFuturo = card.resumo.totalFuturo ?? 0;
  const maior = parcelas.reduce((max, p) => Math.max(max, p.total), 0);

  const visiveis = verTodas ? parcelas : parcelas.slice(0, MESES_VISIVEIS);
  const restantes = parcelas.length - visiveis.length;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 rounded-3xl p-5 sm:max-w-md">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-lg">Próximas faturas</DialogTitle>
          <DialogDescription>
            O que já está comprometido no {card.nome} pelas compras parceladas.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 rounded-2xl bg-secondary px-4 py-3.5">
          <p className="text-xs text-muted-foreground">
            Total preso em parcelas futuras
          </p>
          <p className="font-numeric text-2xl font-semibold">
            {formatCurrency(totalFuturo)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Esse valor já saiu do limite disponível — como no banco, o
            parcelamento compromete a compra inteira na hora.
          </p>
        </div>

        {parcelas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <CalendarClock className="size-5" />
            </span>
            <p className="text-sm font-semibold">Nenhuma parcela futura</p>
            <p className="text-xs text-muted-foreground">
              Compras parceladas aparecem aqui, mês a mês.
            </p>
          </div>
        ) : (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            <ul className="flex flex-col gap-2">
              {visiveis.map((parcela) => (
                <li key={parcela.competencia}>
                  <button
                    type="button"
                    onClick={() => onVerCompras(parcela.competencia)}
                    className="flex w-full flex-col gap-1.5 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {competenciaExtenso(parcela.competencia)}
                      </span>
                      <span className="shrink-0 font-numeric text-sm font-semibold">
                        {formatCurrency(parcela.total)}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
                    >
                      <div
                        className={cn("h-full rounded-full bg-primary/70")}
                        style={{
                          width: `${maior > 0 ? (parcela.total / maior) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {parcela.quantidade === 1
                        ? "1 parcela"
                        : `${parcela.quantidade} parcelas`}{" "}
                      · vence {dataBR(parcela.vencimento)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {restantes > 0 && (
              <Button
                variant="ghost"
                size="lg"
                className="mt-2 w-full rounded-full text-muted-foreground"
                onClick={() => setVerTodas(true)}
              >
                Ver mais {restantes === 1 ? "1 mês" : `${restantes} meses`}
              </Button>
            )}
          </div>
        )}

        <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-4"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {parcelas.length > 0 && (
            <Button
              size="lg"
              className="rounded-full px-4 font-semibold"
              onClick={() => onVerCompras(parcelas[0].competencia)}
            >
              <Receipt className="size-4" />
              Ver {competenciaExtenso(parcelas[0].competencia)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
