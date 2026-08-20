"use client";

import { CalendarClock, Receipt, Repeat, Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CardComResumo, ResumoFatura } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { LimiteProgress } from "@/components/cartoes/limite-progress";
import { StatusFaturaBadge } from "@/components/cartoes/status-fatura-badge";
import { ConfirmarPagamentoDialog } from "@/components/cartoes/confirmar-pagamento-dialog";
import {
  competenciaExtenso,
  dataBR,
  faturaAPagar,
  faturaAtrasada,
  formatPercent,
} from "@/components/cartoes/fatura-utils";

/**
 * Bloco de limite + fatura dentro do card do cartão: quanto sobra, quanto do
 * limite está em uso, a fatura do mês, o que está em aberto e os atalhos para
 * ver as compras e pagar.
 */
export function CartaoResumo({
  card,
  onVerCompras,
  onVerParcelasFuturas,
  onPagar,
}: {
  card: CardComResumo;
  onVerCompras: (competencia: string) => void;
  onVerParcelasFuturas: () => void;
  /** Devolve `true` quando o pagamento foi concluído. */
  onPagar: (competencia: string, valor: number) => Promise<boolean>;
}) {
  const { resumo } = card;
  const atual = resumo.faturaAtual;
  const emAberto = resumo.faturasEmAberto;
  const totalEmAberto = emAberto.reduce((soma, f) => soma + f.total, 0);
  const algumaAtrasada = emAberto.some(faturaAtrasada);

  const parcelasFuturas = resumo.parcelasFuturas ?? [];
  const totalFuturo = resumo.totalFuturo ?? 0;
  const assinaturas = resumo.assinaturas ?? [];
  const totalAssinaturas = resumo.totalAssinaturasMensal ?? 0;

  const aPagar: ResumoFatura | null = faturaAPagar(resumo);
  const competenciaExtrato = atual?.competencia ?? aPagar?.competencia ?? null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Disponível</span>
            <span className="font-numeric text-2xl font-semibold">
              {formatCurrency(resumo.disponivel)}
            </span>
          </div>
          <span className="shrink-0 pb-1 text-xs text-muted-foreground">
            de {formatCurrency(resumo.limite)}
          </span>
        </div>

        <LimiteProgress percentual={resumo.percentualUtilizado} />

        <p className="text-xs text-muted-foreground">
          {formatPercent(resumo.percentualUtilizado)} do limite em uso ·{" "}
          <span className="font-numeric">{formatCurrency(resumo.utilizado)}</span>
        </p>
      </div>

      {atual && (
        <div className="flex flex-col gap-1 rounded-2xl bg-secondary px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              Fatura de {competenciaExtenso(atual.competencia)}
            </span>
            <StatusFaturaBadge
              status={atual.status}
              atrasada={faturaAtrasada(atual)}
            />
          </div>
          <span className="font-numeric text-lg font-semibold">
            {formatCurrency(atual.total)}
          </span>
          <span className="text-xs text-muted-foreground">
            {atual.quantidade === 1
              ? "1 lançamento"
              : `${atual.quantidade} lançamentos`}{" "}
            · vence{" "}
            <span
              className={cn(
                "font-medium",
                faturaAtrasada(atual) ? "text-destructive" : "text-foreground"
              )}
            >
              {dataBR(atual.vencimento)}
            </span>
          </span>
        </div>
      )}

      {emAberto.length > 0 && (
        <button
          type="button"
          onClick={() => onVerCompras(emAberto[0].competencia)}
          className={cn(
            "flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left text-xs font-medium transition-colors",
            algumaAtrasada
              ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "bg-secondary text-muted-foreground hover:bg-secondary/70"
          )}
        >
          <span>
            {emAberto.length === 1
              ? "1 fatura em aberto"
              : `${emAberto.length} faturas em aberto`}
            {algumaAtrasada ? " · atrasada" : ""}
          </span>
          <span className="font-numeric font-semibold">
            {formatCurrency(totalEmAberto)}
          </span>
        </button>
      )}

      {totalFuturo > 0 && (
        <button
          type="button"
          onClick={onVerParcelasFuturas}
          className="flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary"
        >
          <span className="flex items-center gap-1.5">
            <CalendarClock aria-hidden className="size-3.5 shrink-0" />
            <span className="font-numeric font-medium text-foreground">
              {formatCurrency(totalFuturo)}
            </span>
            em parcelas futuras
          </span>
          <span className="shrink-0 font-medium">
            {parcelasFuturas.length === 1
              ? "1 mês"
              : `${parcelasFuturas.length} meses`}
          </span>
        </button>
      )}

      {/*
        Assinaturas não entram no "utilizado" — o que já foi cobrado virou
        lançamento e a fatura conta. Isto responde outra pergunta: quanto do
        limite volta a sumir todo mês só com mensalidades.
      */}
      {totalAssinaturas > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-secondary/60 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Repeat aria-hidden className="size-3.5 shrink-0" />
              <span className="font-numeric font-medium text-foreground">
                {formatCurrency(totalAssinaturas)}
              </span>
              por mês em assinaturas
            </span>
            <span className="shrink-0 font-medium">
              {assinaturas.length === 1 ? "1 ativa" : `${assinaturas.length} ativas`}
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {assinaturas.slice(0, 3).map((assinatura) => (
              <li
                key={assinatura.id}
                className="flex items-center justify-between gap-2 text-[0.7rem]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: assinatura.categoria?.cor ?? "#94a3b8" }}
                  />
                  <span className="truncate text-foreground/90">{assinatura.nome}</span>
                  <span className="shrink-0 text-muted-foreground">
                    dia {assinatura.diaCobranca}
                  </span>
                </span>
                <span className="font-numeric shrink-0 text-muted-foreground">
                  {formatCurrency(assinatura.valor)}
                </span>
              </li>
            ))}
            {assinaturas.length > 3 && (
              <li className="text-[0.7rem] text-muted-foreground">
                +{assinaturas.length - 3}{" "}
                {assinaturas.length - 3 === 1 ? "assinatura" : "assinaturas"}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2">
        {competenciaExtrato && (
          <Button
            variant="outline"
            size="lg"
            className="flex-1 rounded-full px-3"
            onClick={() => onVerCompras(competenciaExtrato)}
          >
            <Receipt className="size-4" />
            Ver compras
          </Button>
        )}

        {aPagar && (
          <ConfirmarPagamentoDialog
            cardNome={card.nome}
            competencia={aPagar.competencia}
            valor={aPagar.total}
            vencimento={aPagar.vencimento}
            trigger={
              <Button
                size="lg"
                className="flex-1 rounded-full px-3 font-semibold"
                aria-label={`Pagar fatura de ${competenciaExtenso(
                  aPagar.competencia
                )} do ${card.nome}`}
              >
                <Wallet className="size-4" />
                Pagar fatura
              </Button>
            }
            onConfirm={async () => {
              await onPagar(aPagar.competencia, aPagar.total);
            }}
          />
        )}
      </div>
    </>
  );
}
