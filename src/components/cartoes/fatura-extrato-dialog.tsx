"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Receipt, Undo2, Wallet } from "lucide-react";

import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Card as CardEntity, ExtratoFatura } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusFaturaBadge } from "@/components/cartoes/status-fatura-badge";
import { ConfirmarPagamentoDialog } from "@/components/cartoes/confirmar-pagamento-dialog";
import {
  competenciaExtenso,
  competenciaVizinha,
  dataBR,
  diaMesBR,
  diaMesInstanteBR,
  hojeISO,
  instanteBR,
} from "@/components/cartoes/fatura-utils";

/**
 * Extrato da fatura: o que foi comprado no ciclo, com navegação entre
 * competências (‹ ›) e as ações de pagar / desfazer o pagamento.
 *
 * Montado só quando aberto (a página renderiza condicionalmente), então o
 * `useFetch` interno já nasce apontando para a competência certa.
 */
export function FaturaExtratoDialog({
  card,
  competenciaInicial,
  onOpenChange,
  onPagar,
  onDesfazer,
}: {
  card: CardEntity;
  competenciaInicial: string;
  onOpenChange: (open: boolean) => void;
  /** Devolve `true` quando o pagamento foi concluído. */
  onPagar: (competencia: string, valor: number) => Promise<boolean>;
  onDesfazer: (competencia: string) => Promise<boolean>;
}) {
  const [competencia, setCompetencia] = React.useState(competenciaInicial);

  const { data, loading, error, refetch } = useFetch<ExtratoFatura>(
    `/api/cards/${card.id}/faturas/${competencia}`
  );

  // Enquanto troca de mês o `data` antigo continua na tela; usar só o que
  // bate com a competência atual evita mostrar números do mês anterior.
  const extrato = data?.competencia === competencia ? data : null;

  const atrasada =
    !!extrato &&
    extrato.status !== "PAGA" &&
    extrato.total > 0 &&
    extrato.vencimento.slice(0, 10) < hojeISO();

  const podePagar = !!extrato && extrato.status !== "PAGA" && extrato.total > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-3 pr-8">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: card.cor }}
            />
            <DialogTitle className="truncate text-lg">
              Fatura · {card.nome}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              aria-label="Fatura do mês anterior"
              onClick={() => setCompetencia((c) => competenciaVizinha(c, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-40 text-center font-heading text-sm font-semibold">
              {competenciaExtenso(competencia)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              aria-label="Fatura do mês seguinte"
              onClick={() => setCompetencia((c) => competenciaVizinha(c, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <DialogDescription className="sr-only">
            Compras lançadas no ciclo da fatura, com a opção de marcar a fatura
            como paga.
          </DialogDescription>
        </DialogHeader>

        {loading && !extrato && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {extrato && (
          <>
            <div className="shrink-0 rounded-2xl bg-secondary px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Total da fatura
                  </span>
                  <span
                    className={cn(
                      "font-numeric text-2xl font-semibold",
                      extrato.total > 0 ? "text-expense" : "text-foreground"
                    )}
                  >
                    {formatCurrency(extrato.total)}
                  </span>
                </div>
                <StatusFaturaBadge
                  status={extrato.status}
                  atrasada={atrasada}
                  className="mt-1"
                />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Período {diaMesBR(extrato.inicio)} a{" "}
                  {diaMesInstanteBR(extrato.fechamento)}
                </span>
                <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                <span>
                  Vence em{" "}
                  <span
                    className={cn(
                      "font-medium",
                      atrasada ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {dataBR(extrato.vencimento)}
                  </span>
                </span>
              </div>

              {extrato.pagoEm && (
                <p className="mt-2 text-xs font-medium text-income">
                  Paga em {instanteBR(extrato.pagoEm)}
                  {extrato.valorPago !== null &&
                    ` · ${formatCurrency(extrato.valorPago)}`}
                </p>
              )}
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {extrato.lancamentos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Receipt className="size-5" />
                  </span>
                  <p className="text-sm font-semibold">
                    Nenhuma compra neste ciclo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    As compras feitas entre {diaMesBR(extrato.inicio)} e{" "}
                    {diaMesInstanteBR(extrato.fechamento)} aparecem aqui.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {extrato.lancamentos.map((lancamento) => {
                    // ENTRADA no cartão é estorno: abate o total da fatura.
                    const estorno = lancamento.tipo === "ENTRADA";
                    const parcelado =
                      !!lancamento.parcelasTotal && !!lancamento.parcela;
                    // A API já manda "Compra (3/10)" na descrição; o badge
                    // repete isso, então o sufixo sai da linha principal.
                    const descricao = parcelado
                      ? lancamento.descricao.replace(
                          / \(\d+\/\d+\)\s*$/,
                          ""
                        )
                      : lancamento.descricao;
                    return (
                      <li
                        key={lancamento.id}
                        className="flex items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-secondary"
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              lancamento.category?.cor ?? "var(--muted-foreground)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className="truncate">{descricao}</span>
                            {parcelado && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 font-numeric"
                              >
                                {lancamento.parcela}/{lancamento.parcelasTotal}
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[
                              lancamento.category?.nome ?? "Sem categoria",
                              dataBR(lancamento.data),
                              parcelado && lancamento.valorTotal
                                ? `Compra de ${formatCurrency(
                                    lancamento.valorTotal
                                  )}`
                                : null,
                              estorno ? "Estorno" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-numeric text-sm font-semibold",
                            estorno ? "text-income" : "text-expense"
                          )}
                        >
                          {estorno ? "+" : "-"}
                          {formatCurrency(lancamento.valor)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-4"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>

              {extrato.status === "PAGA" && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-4 font-semibold"
                  onClick={async () => {
                    const ok = await onDesfazer(competencia);
                    if (ok) refetch();
                  }}
                >
                  <Undo2 className="size-4" />
                  Desfazer pagamento
                </Button>
              )}

              {podePagar && (
                <ConfirmarPagamentoDialog
                  cardNome={card.nome}
                  competencia={competencia}
                  valor={extrato.total}
                  vencimento={extrato.vencimento}
                  trigger={
                    <Button size="lg" className="rounded-full px-4 font-semibold">
                      <Wallet className="size-4" />
                      Pagar fatura
                    </Button>
                  }
                  onConfirm={async () => {
                    const ok = await onPagar(competencia, extrato.total);
                    if (ok) refetch();
                  }}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
