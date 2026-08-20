"use client";

import * as React from "react";

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

/**
 * Confirmação padrão para ações destrutivas (excluir/arquivar) usada pelas
 * 6 páginas de CRUD. `trigger` é o elemento completo que abre o diálogo
 * (ex.: um botão ícone de lixeira já estilizado).
 */
export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  confirmLabel = "Excluir",
  onConfirm,
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className="gap-5 rounded-3xl p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
          <AlertDialogCancel
            size="lg"
            className="rounded-full px-4"
            disabled={pending}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
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
            {pending ? "Aguarde…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
