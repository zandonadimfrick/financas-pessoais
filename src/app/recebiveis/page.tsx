"use client";

import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar recebível" : "Novo recebível"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do valor a receber."
              : "Cadastre um valor a receber (venda, reembolso, etc)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Ex: Projeto freelance" {...register("descricao")} />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...register("valor", { valueAsNumber: true })}
              />
              {errors.valor && (
                <p className="text-xs text-destructive">{errors.valor.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input id="vencimento" type="date" {...register("vencimento")} />
              {errors.vencimento && (
                <p className="text-xs text-destructive">{errors.vencimento.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value ?? "PENDENTE"} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pagador">Pagador (opcional)</Label>
            <Input id="pagador" placeholder="Ex: Cliente X" {...register("pagador")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea id="observacao" rows={2} {...register("observacao")} />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-accent text-white hover:opacity-90"
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            A Receber
          </h2>
          <p className="text-sm text-muted-foreground">
            Valores a receber: vendas, reembolsos e pendências.
          </p>
        </div>
        <Button
          className="w-full bg-gradient-accent text-white hover:opacity-90 sm:w-auto"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">Pendente / atrasado</p>
            <p className="font-numeric text-xl font-semibold text-expense">
              {formatCurrency(totals.pendente)}
            </p>
          </Card>
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">Já recebido</p>
            <p className="font-numeric text-xl font-semibold text-income">
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
        <Card className="items-center gap-3 px-6 py-12 text-center">
          <HandCoins className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum recebível cadastrado ainda.</p>
          <Button
            variant="outline"
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
        <Card className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Pagador</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => {
                const overdue = isOverdue(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.pagador || "—"}
                    </TableCell>
                    <TableCell>{formatDateBR(r.vencimento.slice(0, 10))}</TableCell>
                    <TableCell>
                      <Badge variant={overdue ? "destructive" : statusBadgeVariant(r.status)}>
                        {overdue ? "Atrasado" : STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right font-numeric font-medium", "text-income")}>
                      {formatCurrency(r.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== "RECEBIDO" && r.status !== "CANCELADO" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Marcar como recebido"
                            onClick={() => markReceived(r)}
                          >
                            <CheckCircle2 className="size-3.5 text-income" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
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
                            <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${r.descricao}`}>
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
