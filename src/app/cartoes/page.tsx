"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Archive, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import type { z } from "zod";

import { cardSchema } from "@/lib/validations";
import type { Account, ArchiveOnDeleteResponse, Card as CardEntity } from "@/lib/types";
import { useEscopoStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type FormValues = z.infer<typeof cardSchema>;

const CORES_SUGERIDAS = [
  "#a855f7",
  "#6366f1",
  "#22d3ee",
  "#16a34a",
  "#e11d48",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
];

const NONE = "__none__";

function emptyValues(escopoDefault: string | null): FormValues {
  return {
    nome: "",
    instituicao: "",
    escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
    limite: 0,
    diaFechamento: 1,
    diaVencimento: 10,
    cor: CORES_SUGERIDAS[0],
    arquivado: false,
    accountId: null,
  };
}

function CardFormDialog({
  open,
  onOpenChange,
  card,
  accounts,
  escopoDefault,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardEntity | null;
  accounts: Account[];
  escopoDefault: string | null;
  onSaved: () => void;
}) {
  const isEdit = !!card;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: emptyValues(escopoDefault),
  });

  React.useEffect(() => {
    if (!open) return;
    if (card) {
      reset({
        nome: card.nome,
        instituicao: card.instituicao,
        escopo: card.escopo,
        limite: card.limite,
        diaFechamento: card.diaFechamento,
        diaVencimento: card.diaVencimento,
        cor: card.cor,
        arquivado: card.arquivado,
        accountId: card.accountId,
      });
    } else {
      reset(emptyValues(escopoDefault));
    }
  }, [open, card, escopoDefault, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const url = isEdit ? `/api/cards/${card!.id}` : "/api/cards";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const fieldErrors = body?.error?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof FormValues, { message: messages[0] });
            }
          }
          toast.error("Verifique os campos destacados.");
        } else {
          toast.error("Não foi possível salvar o cartão.");
        }
        return;
      }

      toast.success(isEdit ? "Cartão atualizado." : "Cartão criado.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao salvar o cartão.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do cartão."
              : "Cadastre um cartão de crédito."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" placeholder="Ex: Nubank Ultravioleta" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instituicao">Instituição</Label>
            <Input id="instituicao" placeholder="Ex: Nu Pagamentos" {...register("instituicao")} />
            {errors.instituicao && (
              <p className="text-xs text-destructive">{errors.instituicao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="limite">Limite</Label>
              <Input
                id="limite"
                type="number"
                step="0.01"
                {...register("limite", { valueAsNumber: true })}
              />
              {errors.limite && (
                <p className="text-xs text-destructive">{errors.limite.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Escopo</Label>
              <Controller
                control={control}
                name="escopo"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa física</SelectItem>
                      <SelectItem value="PJ">Pessoa jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.escopo && (
                <p className="text-xs text-destructive">{errors.escopo.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diaFechamento">Dia de fechamento</Label>
              <Input
                id="diaFechamento"
                type="number"
                min={1}
                max={31}
                {...register("diaFechamento", { valueAsNumber: true })}
              />
              {errors.diaFechamento && (
                <p className="text-xs text-destructive">{errors.diaFechamento.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diaVencimento">Dia de vencimento</Label>
              <Input
                id="diaVencimento"
                type="number"
                min={1}
                max={31}
                {...register("diaVencimento", { valueAsNumber: true })}
              />
              {errors.diaVencimento && (
                <p className="text-xs text-destructive">{errors.diaVencimento.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Conta de débito (opcional)</Label>
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nenhuma</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <Controller
                control={control}
                name="cor"
                render={({ field }) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CORES_SUGERIDAS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "size-6 rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform",
                          field.value === c ? "ring-foreground scale-110" : "ring-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="arquivado" className="cursor-pointer">
                Cartão arquivado
              </Label>
              <Controller
                control={control}
                name="arquivado"
                render={({ field }) => (
                  <Switch
                    id="arquivado"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-accent text-white hover:opacity-90"
            >
              {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar cartão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CartoesPage() {
  const escopo = useEscopoStore((s) => s.escopo);
  const [showArchived, setShowArchived] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CardEntity | null>(null);

  const query = escopo !== "ALL" ? `?escopo=${escopo}` : "";
  const { data: cards, loading, error, refetch } = useFetch<CardEntity[]>(
    `/api/cards${query}`
  );
  const { data: accounts } = useFetch<Account[]>(`/api/accounts${query}`);

  const visible = React.useMemo(
    () => (cards ?? []).filter((c) => showArchived || !c.arquivado),
    [cards, showArchived]
  );

  const handleDelete = async (card: CardEntity) => {
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir o cartão.");
        return;
      }
      const body = (await res.json()) as ArchiveOnDeleteResponse;
      toast.success(body.archived ? "Cartão arquivado." : "Cartão excluído.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir o cartão.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Cartões
          </h2>
          <p className="text-sm text-muted-foreground">
            Cartões de crédito e seus ciclos de fechamento/vencimento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch size="sm" checked={showArchived} onCheckedChange={setShowArchived} />
            Mostrar arquivados
          </label>
          <Button
            className="w-full bg-gradient-accent text-white hover:opacity-90 sm:w-auto"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo cartão
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="items-center px-6 py-10 text-center text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {!loading && !error && visible.length === 0 && (
        <Card className="items-center gap-3 px-6 py-12 text-center">
          <CreditCard className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Criar primeiro cartão
          </Button>
        </Card>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((card) => (
            <Card
              key={card.id}
              className={cn("gap-3 px-5 py-5", card.arquivado && "opacity-60")}
              style={{ borderTop: `3px solid ${card.cor}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${card.cor}26` }}
                  >
                    <CreditCard className="size-4.5" style={{ color: card.cor }} />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold">{card.nome}</p>
                    <p className="text-xs text-muted-foreground">{card.instituicao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${card.nome}`}
                    onClick={() => {
                      setEditing(card);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${card.nome}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    title="Excluir cartão?"
                    description={`"${card.nome}" será excluído. Se houver transações vinculadas, o cartão será arquivado em vez de excluído.`}
                    onConfirm={() => handleDelete(card)}
                  />
                </div>
              </div>

              <Badge variant={card.escopo === "PF" ? "secondary" : "outline"} className="w-fit">
                {card.escopo}
              </Badge>

              <p className="font-numeric text-xl font-semibold">
                {formatCurrency(card.limite)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">limite</span>
              </p>

              <p className="text-xs text-muted-foreground">
                Fecha dia {card.diaFechamento} · Vence dia {card.diaVencimento}
              </p>

              {card.arquivado && (
                <Badge variant="secondary" className="w-fit gap-1">
                  <Archive className="size-3" />
                  Arquivado
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      <CardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={editing}
        accounts={accounts ?? []}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        onSaved={refetch}
      />
    </div>
  );
}
