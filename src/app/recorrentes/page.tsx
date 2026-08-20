"use client";

import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";

import { recurringSchema } from "@/lib/validations";
import type {
  ArchiveOnDeleteResponse,
  Category,
  Periodicidade,
  Recurring,
  TipoLancamento,
} from "@/lib/types";
import { useEscopoStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

// Tipado manualmente (não via z.infer) por causa de `proximaCobranca`, que
// no schema é `z.coerce.date().nullable().optional()` (saída: Date | null);
// no formulário ele é uma string "yyyy-mm-dd" vinda de um `<input type=date>`.
interface FormValues {
  nome: string;
  valor: number;
  tipo?: TipoLancamento;
  periodicidade?: Periodicidade;
  diaCobranca?: number;
  escopo?: "PF" | "PJ";
  ativo?: boolean;
  proximaCobranca?: string | null;
  categoryId?: string | null;
}

const PERIODICIDADE_LABELS: Record<Periodicidade, string> = {
  DIARIA: "Diária",
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
  ANUAL: "Anual",
};

const MONTHLY_FACTOR: Record<Periodicidade, number> = {
  DIARIA: 30,
  SEMANAL: 4.33,
  MENSAL: 1,
  ANUAL: 1 / 12,
};

const NONE = "__none__";

function emptyValues(escopoDefault: string | null): FormValues {
  return {
    nome: "",
    valor: 0,
    tipo: "SAIDA",
    periodicidade: "MENSAL",
    diaCobranca: 1,
    escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
    ativo: true,
    proximaCobranca: null,
    categoryId: null,
  };
}

function RecurringFormDialog({
  open,
  onOpenChange,
  recurring,
  categories,
  escopoDefault,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: Recurring | null;
  categories: Category[];
  escopoDefault: string | null;
  onSaved: () => void;
}) {
  const isEdit = !!recurring;
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(recurringSchema) as unknown as Resolver<FormValues>,
    defaultValues: emptyValues(escopoDefault),
  });

  const tipoSelecionado = watch("tipo");

  React.useEffect(() => {
    if (!open) return;
    if (recurring) {
      reset({
        nome: recurring.nome,
        valor: recurring.valor,
        tipo: recurring.tipo,
        periodicidade: recurring.periodicidade,
        diaCobranca: recurring.diaCobranca,
        escopo: recurring.escopo,
        ativo: recurring.ativo,
        proximaCobranca: recurring.proximaCobranca
          ? recurring.proximaCobranca.slice(0, 10)
          : null,
        categoryId: recurring.categoryId,
      });
    } else {
      reset(emptyValues(escopoDefault));
    }
  }, [open, recurring, escopoDefault, reset]);

  const categoriasFiltradas = categories.filter((c) => c.tipo === tipoSelecionado);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const payload = {
      ...values,
      proximaCobranca: values.proximaCobranca || null,
    };

    const url = isEdit ? `/api/recurrings/${recurring!.id}` : "/api/recurrings";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          toast.error("Não foi possível salvar a recorrência.");
        }
        return;
      }

      toast.success(isEdit ? "Recorrência atualizada." : "Recorrência criada.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao salvar a recorrência.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da assinatura/recorrência."
              : "Cadastre uma assinatura ou lançamento recorrente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" placeholder="Ex: Netflix" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
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
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select value={field.value ?? "SAIDA"} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAIDA">Saída</SelectItem>
                      <SelectItem value="ENTRADA">Entrada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Periodicidade</Label>
              <Controller
                control={control}
                name="periodicidade"
                render={({ field }) => (
                  <Select value={field.value ?? "MENSAL"} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Periodicidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERIODICIDADE_LABELS).map(([value, label]) => (
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
              <Label htmlFor="diaCobranca">Dia de cobrança</Label>
              <Input
                id="diaCobranca"
                type="number"
                min={1}
                max={31}
                {...register("diaCobranca", { valueAsNumber: true })}
              />
              {errors.diaCobranca && (
                <p className="text-xs text-destructive">{errors.diaCobranca.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proximaCobranca">Próxima cobrança (opcional)</Label>
              <Input id="proximaCobranca" type="date" {...register("proximaCobranca")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoria (opcional)</Label>
            <Controller
              control={control}
              name="categoryId"
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
                    {categoriasFiltradas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <Label htmlFor="ativo" className="cursor-pointer">
              Recorrência ativa
            </Label>
            <Controller
              control={control}
              name="ativo"
              render={({ field }) => (
                <Switch
                  id="ativo"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
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
              {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar recorrência"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RecorrentesPage() {
  const escopo = useEscopoStore((s) => s.escopo);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Recurring | null>(null);

  const query = escopo !== "ALL" ? `?escopo=${escopo}` : "";
  const { data: recurrings, loading, error, refetch } = useFetch<Recurring[]>(
    `/api/recurrings${query}`
  );
  const { data: categories } = useFetch<Category[]>(`/api/categories`);
  const categoriesById = React.useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories]
  );

  const list = React.useMemo(() => recurrings ?? [], [recurrings]);

  const monthlyTotals = React.useMemo(() => {
    const ativos = list.filter((r) => r.ativo);
    const saida = ativos
      .filter((r) => r.tipo === "SAIDA")
      .reduce((sum, r) => sum + r.valor * MONTHLY_FACTOR[r.periodicidade], 0);
    const entrada = ativos
      .filter((r) => r.tipo === "ENTRADA")
      .reduce((sum, r) => sum + r.valor * MONTHLY_FACTOR[r.periodicidade], 0);
    return { saida, entrada };
  }, [list]);

  const handleDelete = async (r: Recurring) => {
    try {
      const res = await fetch(`/api/recurrings/${r.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir a recorrência.");
        return;
      }
      const body = (await res.json()) as ArchiveOnDeleteResponse;
      toast.success(body.archived ? "Recorrência desativada." : "Recorrência excluída.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir a recorrência.");
    }
  };

  const toggleAtivo = async (r: Recurring, ativo: boolean) => {
    try {
      const res = await fetch(`/api/recurrings/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      });
      if (!res.ok) {
        toast.error("Não foi possível atualizar a recorrência.");
        return;
      }
      refetch();
    } catch {
      toast.error("Erro de rede ao atualizar a recorrência.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Recorrentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Assinaturas e lançamentos recorrentes (entradas e saídas).
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
          Nova recorrência
        </Button>
      </div>

      {!loading && !error && list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Custo recorrente mensal estimado (saídas ativas)
            </p>
            <p className="font-numeric text-xl font-semibold text-expense">
              {formatCurrency(monthlyTotals.saida)}
            </p>
            <p className="text-xs text-muted-foreground">
              Estimativa: semanal ×4,33, anual ÷12, diária ×30.
            </p>
          </Card>
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Receita recorrente mensal estimada (entradas ativas)
            </p>
            <p className="font-numeric text-xl font-semibold text-income">
              {formatCurrency(monthlyTotals.entrada)}
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
          <Repeat className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma recorrência cadastrada ainda.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Criar primeira recorrência
          </Button>
        </Card>
      )}

      {!loading && !error && list.length > 0 && (
        <Card className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Próxima cobrança</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id} className={cn(!r.ativo && "opacity-60")}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.categoryId ? categoriesById.get(r.categoryId)?.nome ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{PERIODICIDADE_LABELS[r.periodicidade]}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.proximaCobranca ? formatDateBR(r.proximaCobranca.slice(0, 10)) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-numeric font-medium",
                      r.tipo === "ENTRADA" ? "text-income" : "text-expense"
                    )}
                  >
                    {r.tipo === "ENTRADA" ? "+" : "-"}
                    {formatCurrency(r.valor)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="sm"
                      checked={r.ativo}
                      onCheckedChange={(checked) => toggleAtivo(r, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${r.nome}`}
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDeleteDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${r.nome}`}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                        title="Excluir recorrência?"
                        description={`"${r.nome}" será excluída. Se houver transações vinculadas, ela será desativada em vez de excluída.`}
                        onConfirm={() => handleDelete(r)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <RecurringFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recurring={editing}
        categories={categories ?? []}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        onSaved={refetch}
      />
    </div>
  );
}
