"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { competenciaExtenso, dataBR } from "@/components/cartoes/fatura-utils";

/**
 * Confirmação de pagamento de fatura. Não reusa o `ConfirmDeleteDialog`
 * porque aqui a ação não é destrutiva: o botão é primário, não vermelho.
 */
export function ConfirmarPagamentoDialog({
  trigger,
  cardNome,
  competencia,
  valor,
  vencimento,
  onConfirm,
}: {
  trigger: React.ReactElement;
  cardNome: string;
  competencia: string;
  valor: number;
  vencimento: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className="gap-5 rounded-3xl p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">Pagar a fatura?</AlertDialogTitle>
          <AlertDialogDescription>
            Fatura de {competenciaExtenso(competencia)} do {cardNome.trim()},
            com vencimento em {dataBR(vencimento)}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1 rounded-2xl bg-secondary px-4 py-3.5 text-center sm:text-left">
          <span className="text-xs text-muted-foreground">Valor da fatura</span>
          <span className="font-numeric text-2xl font-semibold">
            {formatCurrency(valor)}
          </span>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            Confirmar apenas libera esse valor no limite do cartão. Nenhuma saída
            nova é criada — as compras já foram lançadas quando aconteceram, e
            lançar de novo contaria o mesmo dinheiro duas vezes.
          </span>
        </p>

        <AlertDialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
          <AlertDialogCancel
            size="lg"
            className="rounded-full px-4"
            disabled={pending}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            size="lg"
            className="rounded-full px-4 font-semibold"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Pagando…" : "Confirmar pagamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
