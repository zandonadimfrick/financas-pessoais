"use client";

import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Clock, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";

import { receivableSchema } from "@/lib/validations";
import type { Receivable, StatusRecebivel } from "@/lib/types";
import { useEscopoStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency, formatDateBR, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Tipado manualmente (em vez de `z.infer<typeof receivableSchema>`) porque
// `vencimento` usa `z.coerce.date()`: o tipo de saída do schema é `Date`,
// mas o campo de formulário trabalha com string "yyyy-mm-dd" (valor nativo
// de um `<input type="date">`) — o zodResolver ainda valida/coage esse
// valor normalmente em runtime.
interface FormValues {
  descricao: string;
  valor: number;
  vencimento: string;
  status?: StatusRecebivel;
  escopo?: "PF" | "PJ";
  pagador?: string | null;
  observacao?: string | null;
}

const STATUS_LABELS: Record<StatusRecebivel, string> = {
  PENDENTE: "Pendente",
  RECEBIDO: "Recebido",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

function statusBadgeVariant(status: StatusRecebivel): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "RECEBIDO":
      return "default";
    case "ATRASADO":
      return "destructive";
    case "CANCELADO":
      return "outline";
    default:
      return "secondary";
  }
}

function isOverdue(r: Receivable) {
  if (r.status !== "PENDENTE") return false;
  return r.vencimento.slice(0, 10) < toISODate(new Date());
}

function emptyValues(escopoDefault: string | null): FormValues {
  return {
    descricao: "",
    valor: 0,
    vencimento: toISODate(new Date()),
    status: "PENDENTE",
    escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
    pagador: "",
    observacao: "",
  };
}

function ReceivableFormDialog({
  open,
  onOpenChange,
  receivable,
  escopoDefault,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable | null;
  escopoDefault: string | null;
  onSaved: () => void;
}) {
  const isEdit = !!receivable;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(receivableSchema) as unknown as Resolver<FormValues>,
    defaultValues: emptyValues(escopoDefault),
  });

  React.useEffect(() => {
    if (!open) return;
    if (receivable) {
      reset({
        descricao: receivable.descricao,
        valor: receivable.valor,
        vencimento: receivable.vencimento.slice(0, 10),
        status: receivable.status,
        escopo: receivable.escopo,
        pagador: receivable.pagador ?? "",
        observacao: receivable.observacao ?? "",
      });
    } else {
      reset(emptyValues(escopoDefault));
    }
  }, [open, receivable, escopoDefault, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const url = isEdit ? `/api/receivables/${receivable!.id}` : "/api/receivables";
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
          toast.error("Não foi possível salvar o recebível.");
        }
        return;
      }

      toast.success(isEdit ? "Recebível atualizado." : "Recebível criado.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao salvar o recebível.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEdit ? "Editar recebível" : "Novo recebível"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do valor a receber."
              : "Cadastre um valor a receber (venda, reembolso, etc)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Projeto freelance"
              className="h-9 rounded-full px-3.5"
              {...register("descricao")}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="Ex: 1500,00"
                className="h-9 rounded-full px-3.5"
                {...register("valor", { valueAsNumber: true })}
              />
              {errors.valor && (
                <p className="text-xs text-destructive">{errors.valor.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input
                id="vencimento"
                type="date"
                className="h-9 rounded-full px-3.5"
                {...register("vencimento")}
              />
              {errors.vencimento && (
                <p className="text-xs text-destructive">{errors.vencimento.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value ?? "PENDENTE"} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full rounded-full px-3.5">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Escopo</Label>
              <Controller
                control={control}
                name="escopo"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pagador">Pagador (opcional)</Label>
            <Input
              id="pagador"
              placeholder="Ex: Cliente X"
              className="h-9 rounded-full px-3.5"
              {...register("pagador")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              rows={2}
              placeholder="Ex: Metade na assinatura, metade na entrega"
              className="rounded-2xl px-3.5 py-2.5"
              {...register("observacao")}
            />
          </div>

          <DialogFooter className="mx-0 mt-1 mb-0 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="rounded-full px-4 font-semibold"
            >
              {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar recebível"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RecebiveisPage() {
  const escopo = useEscopoStore((s) => s.escopo);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Receivable | null>(null);

  const query = escopo !== "ALL" ? `?escopo=${escopo}` : "";
  const { data: receivables, loading, error, refetch } = useFetch<Receivable[]>(
    `/api/receivables${query}`
  );

  const list = React.useMemo(() => receivables ?? [], [receivables]);
  const totals = React.useMemo(() => {
    const pendente = list
      .filter((r) => r.status === "PENDENTE" || r.status === "ATRASADO")
      .reduce((sum, r) => sum + r.valor, 0);
    const recebido = list
      .filter((r) => r.status === "RECEBIDO")
      .reduce((sum, r) => sum + r.valor, 0);
    return { pendente, recebido };
  }, [list]);

  const handleDelete = async (r: Receivable) => {
    try {
      const res = await fetch(`/api/receivables/${r.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir o recebível.");
        return;
      }
      toast.success("Recebível excluído.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir o recebível.");
    }
  };

  const markReceived = async (r: Receivable) => {
    try {
      const res = await fetch(`/api/receivables/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECEBIDO" }),
      });
      if (!res.ok) {
        toast.error("Não foi possível marcar como recebido.");
        return;
      }
      toast.success("Marcado como recebido.");
      refetch();
    } catch {
      toast.error("Erro de rede ao atualizar o recebível.");
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            A Receber
          </h2>
          <p className="text-sm text-muted-foreground">
            O que ainda está para entrar: vendas, reembolsos e pendências.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full rounded-full px-4 font-semibold sm:w-auto"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Novo recebível
        </Button>
      </div>

      {!loading && !error && list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
          <Card className="gap-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Clock className="size-4" />
              </span>
              <p className="text-xs font-medium text-muted-foreground">
                Pendente / atrasado
              </p>
            </div>
            <p className="font-numeric text-2xl font-semibold text-expense">
              {formatCurrency(totals.pendente)}
            </p>
          </Card>
          <Card className="gap-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <CheckCircle2 className="size-4" />
              </span>
              <p className="text-xs font-medium text-muted-foreground">
                Já recebido
              </p>
            </div>
            <p className="font-numeric text-2xl font-semibold text-income">
              {formatCurrency(totals.recebido)}
            </p>
          </Card>
        </div>
      )}

      {loading && <Skeleton className="h-72 rounded-2xl" />}

      {!loading && error && (
        <Card className="items-center px-6 py-10 text-center text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {!loading && !error && list.length === 0 && (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <HandCoins className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-base font-semibold">
              Nada a receber por enquanto
            </p>
            <p className="text-sm text-muted-foreground">
              Cadastre um valor a receber pra não perder o prazo de cobrança.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-full px-4 font-semibold"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Criar primeiro recebível
          </Button>
        </Card>
      )}

      {!loading && !error && list.length > 0 && (
        <>
          {/* Mobile: lista de cards — tabela em tela pequena obriga rolagem lateral. */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {list.map((r) => {
              const overdue = isOverdue(r);
              const recebido = r.status === "RECEBIDO";
              const subtitulo = [
                r.pagador || null,
                `vence ${formatDateBR(r.vencimento.slice(0, 10))}`,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/10"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        recebido
                          ? "bg-income/10 text-income"
                          : overdue
                            ? "bg-primary/10 text-expense"
                            : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {recebido ? (
                        <CheckCircle2 className="size-4.5" />
                      ) : (
                        <HandCoins className="size-4.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.descricao}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {subtitulo}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-numeric text-sm font-semibold text-income">
                        {formatCurrency(r.valor)}
                      </span>
                      <Badge
                        variant={overdue ? "destructive" : statusBadgeVariant(r.status)}
                      >
                        {overdue ? "Atrasado" : STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    {r.status !== "RECEBIDO" && r.status !== "CANCELADO" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label={`Marcar ${r.descricao} como recebido`}
                        title="Marcar como recebido"
                        onClick={() => markReceived(r)}
                      >
                        <CheckCircle2 className="size-3.5 text-income" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground"
                      aria-label={`Editar ${r.descricao}`}
                      onClick={() => {
                        setEditing(r);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <ConfirmDeleteDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground"
                          aria-label={`Excluir ${r.descricao}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      title="Excluir recebível?"
                      description={`"${r.descricao}" será excluído permanentemente.`}
                      onConfirm={() => handleDelete(r)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabela */}
          <Card className="hidden px-0 py-0 md:flex">
            <Table>
              <TableHeader className="[&_tr]:border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Pagador
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Vencimento
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-11 px-5 text-right text-xs font-medium text-muted-foreground">
                    Valor
                  </TableHead>
                  <TableHead className="h-11 px-5 text-right text-xs font-medium text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const overdue = isOverdue(r);
                  return (
                    <TableRow key={r.id} className="border-border/60">
                      <TableCell className="px-5 py-3.5 font-medium">
                        {r.descricao}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {r.pagador || "—"}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {formatDateBR(r.vencimento.slice(0, 10))}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Badge variant={overdue ? "destructive" : statusBadgeVariant(r.status)}>
                          {overdue ? "Atrasado" : STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-5 py-3.5 text-right font-numeric font-semibold",
                          "text-income"
                        )}
                      >
                        {formatCurrency(r.valor)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status !== "RECEBIDO" && r.status !== "CANCELADO" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full"
                              aria-label={`Marcar ${r.descricao} como recebido`}
                              title="Marcar como recebido"
                              onClick={() => markReceived(r)}
                            >
                              <CheckCircle2 className="size-3.5 text-income" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full text-muted-foreground"
                            aria-label={`Editar ${r.descricao}`}
                            onClick={() => {
                              setEditing(r);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <ConfirmDeleteDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full text-muted-foreground"
                                aria-label={`Excluir ${r.descricao}`}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                            title="Excluir recebível?"
                            description={`"${r.descricao}" será excluído permanentemente.`}
                            onConfirm={() => handleDelete(r)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <ReceivableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        receivable={editing}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        onSaved={refetch}
      />
    </div>
  );
}
