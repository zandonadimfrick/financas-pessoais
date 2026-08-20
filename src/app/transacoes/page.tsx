"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { categorySchema, transactionSchema } from "@/lib/validations";
import type {
  Account,
  Card as CardEntity,
  Category,
  Transaction,
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
import { Textarea } from "@/components/ui/textarea";
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

// Tipado manualmente por causa de `data`, que no schema é
// `z.coerce.date()` (saída: Date); no formulário é a string "yyyy-mm-dd" de
// um `<input type="date">`.
interface FormValues {
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  data: string;
  escopo?: "PF" | "PJ";
  observacao?: string | null;
  efetivado?: boolean;
  categoryId?: string | null;
  accountId?: string | null;
  cardId?: string | null;
}

const NONE = "__none__";
const NEW_CATEGORY = "__new__";

function toISODateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function emptyValues(escopoDefault: string | null): FormValues {
  return {
    descricao: "",
    valor: 0,
    tipo: "SAIDA",
    data: toISODateStr(new Date()),
    escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
    observacao: "",
    efetivado: true,
    categoryId: null,
    accountId: null,
    cardId: null,
  };
}

function NewCategoryDialog({
  open,
  onOpenChange,
  tipo,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: TipoLancamento;
  onCreated: (category: Category) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ nome: string }>({ defaultValues: { nome: "" } });

  React.useEffect(() => {
    if (open) reset({ nome: "" });
  }, [open, reset]);

  const onSubmit = async ({ nome }: { nome: string }) => {
    const parsed = categorySchema.safeParse({ nome, tipo });
    if (!parsed.success) {
      setError("nome", { message: parsed.error.issues[0]?.message });
      return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError("nome", { message: "Já existe uma categoria com esse nome" });
        } else {
          toast.error("Não foi possível criar a categoria.");
        }
        return;
      }
      const category = (await res.json()) as Category;
      toast.success("Categoria criada.");
      onCreated(category);
      onOpenChange(false);
    } catch {
      toast.error("Erro de rede ao criar categoria.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
          <DialogDescription>
            Categoria do tipo {tipo === "ENTRADA" ? "entrada" : "saída"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input id="categoria-nome" placeholder="Ex: Mercado" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  accounts,
  cards,
  escopoDefault,
  onSaved,
  onCategoryCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  cards: CardEntity[];
  escopoDefault: string | null;
  onSaved: () => void;
  onCategoryCreated: () => Promise<void> | void;
}) {
  const isEdit = !!transaction;
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(transactionSchema) as unknown as Resolver<FormValues>,
    defaultValues: emptyValues(escopoDefault),
  });

  const [newCategoryOpen, setNewCategoryOpen] = React.useState(false);
  const tipoSelecionado = watch("tipo");

  React.useEffect(() => {
    if (!open) return;
    if (transaction) {
      reset({
        descricao: transaction.descricao,
        valor: transaction.valor,
        tipo: transaction.tipo,
        data: transaction.data.slice(0, 10),
        escopo: transaction.escopo,
        observacao: transaction.observacao ?? "",
        efetivado: transaction.efetivado,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        cardId: transaction.cardId,
      });
    } else {
      reset(emptyValues(escopoDefault));
    }
  }, [open, transaction, escopoDefault, reset]);

  const categoriasFiltradas = categories.filter((c) => c.tipo === tipoSelecionado);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
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
          toast.error("Não foi possível salvar a transação.");
        }
        return;
      }

      const saved = (await res.json()) as Transaction;
      toast.success(isEdit ? "Transação atualizada." : "Transação criada.", {
        action: !isEdit
          ? {
              label: "Anexar documento",
              onClick: () => {
                router.push(`/documentos?transactionId=${saved.id}`);
              },
            }
          : undefined,
      });
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao salvar a transação.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar transação" : "Nova transação"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize os dados do lançamento."
                : "Registre uma entrada ou saída."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Ex: Supermercado" {...register("descricao")} />
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
                  placeholder="Ex: 150,00"
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
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setValue("categoryId", null);
                      }}
                    >
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
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" {...register("data")} />
                {errors.data && (
                  <p className="text-xs text-destructive">{errors.data.message}</p>
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

            <div className="flex flex-col gap-1.5">
              <Label>Categoria (opcional)</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => {
                      if (v === NEW_CATEGORY) {
                        setNewCategoryOpen(true);
                        return;
                      }
                      field.onChange(v === NONE ? null : v);
                    }}
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
                      <SelectItem value={NEW_CATEGORY}>+ Criar nova categoria</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Conta (opcional)</Label>
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
                <Label>Cartão (opcional)</Label>
                <Controller
                  control={control}
                  name="cardId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nenhum</SelectItem>
                        {cards.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                rows={2}
                placeholder="Ex: Compra parcelada em 3x no cartão Nubank"
                {...register("observacao")}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="efetivado" className="cursor-pointer">
                Já efetivado
              </Label>
              <Controller
                control={control}
                name="efetivado"
                render={({ field }) => (
                  <Switch
                    id="efetivado"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {isEdit && (
              <Link
                href={`/documentos?transactionId=${transaction!.id}`}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <FileText className="size-3.5" />
                Ver documentos anexados a esta transação
              </Link>
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
                {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar transação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <NewCategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
        tipo={tipoSelecionado}
        onCreated={async (category) => {
          await onCategoryCreated();
          setValue("categoryId", category.id);
        }}
      />
    </>
  );
}

interface TransferFormState {
  valor: string;
  data: string;
  contaOrigemId: string;
  contaDestinoId: string;
  observacao: string;
}

function emptyTransferValues(): TransferFormState {
  return {
    valor: "",
    data: toISODateStr(new Date()),
    contaOrigemId: "",
    contaDestinoId: "",
    observacao: "",
  };
}

/**
 * Transferência entre contas próprias: não usa o schema/endpoint de
 * transação única porque uma transferência é, na prática, DUAS transações
 * (uma SAÍDA na conta de origem e uma ENTRADA na de destino) marcadas com as
 * categorias "Transferência enviada"/"Transferência recebida" — assim ela
 * não é contada como ganho ou gasto real nos relatórios por categoria.
 */
function TransferDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<TransferFormState>(emptyTransferValues());
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValues(emptyTransferValues());
      setFormError(null);
    }
    onOpenChange(next);
  };

  const categoriaEnviada = categories.find((c) => c.nome === "Transferência enviada");
  const categoriaRecebida = categories.find((c) => c.nome === "Transferência recebida");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const valorNumerico = Number(values.valor);
    if (!valorNumerico || valorNumerico <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    if (!values.contaOrigemId || !values.contaDestinoId) {
      setFormError("Selecione a conta de origem e a de destino.");
      return;
    }
    if (values.contaOrigemId === values.contaDestinoId) {
      setFormError("A conta de origem precisa ser diferente da de destino.");
      return;
    }
    if (!categoriaEnviada || !categoriaRecebida) {
      setFormError(
        "Categorias de transferência não encontradas. Recarregue a página e tente de novo."
      );
      return;
    }

    const contaOrigem = accounts.find((a) => a.id === values.contaOrigemId);
    const contaDestino = accounts.find((a) => a.id === values.contaDestinoId);
    if (!contaOrigem || !contaDestino) return;

    setSubmitting(true);
    try {
      const descricaoBase = `Transferência: ${contaOrigem.nome} → ${contaDestino.nome}`;

      const saida = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricaoBase,
          valor: valorNumerico,
          tipo: "SAIDA",
          data: values.data,
          escopo: contaOrigem.escopo,
          observacao: values.observacao || null,
          efetivado: true,
          categoryId: categoriaEnviada.id,
          accountId: contaOrigem.id,
        }),
      });
      if (!saida.ok) {
        setFormError("Não foi possível registrar a saída na conta de origem.");
        setSubmitting(false);
        return;
      }

      const entrada = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricaoBase,
          valor: valorNumerico,
          tipo: "ENTRADA",
          data: values.data,
          escopo: contaDestino.escopo,
          observacao: values.observacao || null,
          efetivado: true,
          categoryId: categoriaRecebida.id,
          accountId: contaDestino.id,
        }),
      });
      if (!entrada.ok) {
        toast.error(
          "A saída foi registrada, mas a entrada na conta de destino falhou. Confira em Transações."
        );
        onOpenChange(false);
        onSaved();
        return;
      }

      toast.success("Transferência registrada nas duas contas.");
      onOpenChange(false);
      onSaved();
    } catch {
      setFormError("Erro de rede ao registrar a transferência.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferência entre contas</DialogTitle>
          <DialogDescription>
            Move dinheiro de uma conta sua pra outra — não conta como entrada nem saída real
            nos relatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-valor">Valor</Label>
              <Input
                id="transfer-valor"
                type="number"
                step="0.01"
                placeholder="Ex: 500,00"
                value={values.valor}
                onChange={(e) => setValues((v) => ({ ...v, valor: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-data">Data</Label>
              <Input
                id="transfer-data"
                type="date"
                value={values.data}
                onChange={(e) => setValues((v) => ({ ...v, data: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>De (origem)</Label>
              <Select
                value={values.contaOrigemId}
                onValueChange={(v) => setValues((s) => ({ ...s, contaOrigemId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Para (destino)</Label>
              <Select
                value={values.contaDestinoId}
                onValueChange={(v) => setValues((s) => ({ ...s, contaDestinoId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-observacao">Observação (opcional)</Label>
            <Textarea
              id="transfer-observacao"
              rows={2}
              placeholder="Ex: Reserva de emergência pro Nubank"
              value={values.observacao}
              onChange={(e) => setValues((v) => ({ ...v, observacao: e.target.value }))}
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-accent text-white hover:opacity-90"
            >
              {submitting ? "Transferindo…" : "Transferir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TransacoesPage() {
  const escopo = useEscopoStore((s) => s.escopo);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);

  const [filters, setFilters] = React.useState({
    from: "",
    tipo: "TODOS" as "TODOS" | TipoLancamento,
    categoryId: NONE,
    accountId: NONE,
    cardId: NONE,
  });

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (escopo !== "ALL") params.set("escopo", escopo);
    if (filters.from) params.set("from", filters.from);
    if (filters.tipo !== "TODOS") params.set("tipo", filters.tipo);
    if (filters.categoryId !== NONE) params.set("categoryId", filters.categoryId);
    if (filters.accountId !== NONE) params.set("accountId", filters.accountId);
    if (filters.cardId !== NONE) params.set("cardId", filters.cardId);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [escopo, filters]);

  const { data: transactions, loading, error, refetch } = useFetch<Transaction[]>(
    `/api/transactions${query}`
  );
  const { data: categories, refetch: refetchCategories } = useFetch<Category[]>(
    "/api/categories"
  );
  const accountsQuery = escopo !== "ALL" ? `?escopo=${escopo}` : "";
  const { data: accounts } = useFetch<Account[]>(`/api/accounts${accountsQuery}`);
  const { data: cards } = useFetch<CardEntity[]>(`/api/cards${accountsQuery}`);

  const list = React.useMemo(() => transactions ?? [], [transactions]);
  const totals = React.useMemo(() => {
    const entradas = list
      .filter((t) => t.tipo === "ENTRADA")
      .reduce((sum, t) => sum + t.valor, 0);
    const saidas = list
      .filter((t) => t.tipo === "SAIDA")
      .reduce((sum, t) => sum + t.valor, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [list]);

  const hasActiveFilters =
    filters.from ||
    filters.tipo !== "TODOS" ||
    filters.categoryId !== NONE ||
    filters.accountId !== NONE ||
    filters.cardId !== NONE;

  const handleDelete = async (t: Transaction) => {
    try {
      const res = await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir a transação.");
        return;
      }
      toast.success("Transação excluída.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir a transação.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Transações
          </h2>
          <p className="text-sm text-muted-foreground">
            Entradas e saídas registradas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setTransferOpen(true)}
          >
            <ArrowRightLeft className="size-4" />
            Transferência
          </Button>
          <Button
            className="w-full bg-gradient-accent text-white hover:opacity-90 sm:w-auto"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova transação
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="gap-3 px-5 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">A partir de</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select
              value={filters.tipo}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, tipo: v as typeof f.tipo }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select
              value={filters.categoryId}
              onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v ?? NONE }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Conta</Label>
            <Select
              value={filters.accountId}
              onValueChange={(v) => setFilters((f) => ({ ...f, accountId: v ?? NONE }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas</SelectItem>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Cartão</Label>
            <Select
              value={filters.cardId}
              onValueChange={(v) => setFilters((f) => ({ ...f, cardId: v ?? NONE }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos</SelectItem>
                {(cards ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() =>
              setFilters({
                from: "",
                tipo: "TODOS",
                categoryId: NONE,
                accountId: NONE,
                cardId: NONE,
              })
            }
          >
            <X className="size-3.5" />
            Limpar filtros
          </Button>
        )}
      </Card>

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">Entradas (filtro)</p>
            <p className="font-numeric text-xl font-semibold text-income">
              +{formatCurrency(totals.entradas)}
            </p>
          </Card>
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">Saídas (filtro)</p>
            <p className="font-numeric text-xl font-semibold text-expense">
              -{formatCurrency(totals.saidas)}
            </p>
          </Card>
          <Card className="gap-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">Saldo (filtro)</p>
            <p
              className={cn(
                "font-numeric text-xl font-semibold",
                totals.saldo >= 0 ? "text-income" : "text-expense"
              )}
            >
              {formatCurrency(totals.saldo)}
            </p>
          </Card>
        </div>
      )}

      {loading && <Skeleton className="h-96 rounded-2xl" />}

      {!loading && error && (
        <Card className="items-center px-6 py-10 text-center text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {!loading && !error && list.length === 0 && (
        <Card className="items-center gap-3 px-6 py-12 text-center">
          <ArrowLeftRight className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Nenhuma transação encontrada para os filtros aplicados."
              : "Nenhuma transação registrada ainda."}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Registrar primeira transação
          </Button>
        </Card>
      )}

      {!loading && !error && list.length > 0 && (
        <Card className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta/Cartão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDateBR(t.data.slice(0, 10))}</TableCell>
                  <TableCell className="font-medium">{t.descricao}</TableCell>
                  <TableCell>
                    {t.category ? (
                      <Badge variant="outline">{t.category.nome}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.account?.nome ?? t.card?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.efetivado ? "secondary" : "outline"}>
                      {t.efetivado ? "Efetivado" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-numeric font-medium",
                      t.tipo === "ENTRADA" ? "text-income" : "text-expense"
                    )}
                  >
                    {t.tipo === "ENTRADA" ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" render={<Link href={`/documentos?transactionId=${t.id}`} />} title="Ver documentos">
                        <FileText className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${t.descricao}`}
                        onClick={() => {
                          setEditing(t);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDeleteDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${t.descricao}`}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                        title="Excluir transação?"
                        description={`"${t.descricao}" será excluída permanentemente.`}
                        onConfirm={() => handleDelete(t)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editing}
        categories={categories ?? []}
        accounts={accounts ?? []}
        cards={cards ?? []}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        onSaved={refetch}
        onCategoryCreated={refetchCategories}
      />

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts ?? []}
        categories={categories ?? []}
        onSaved={refetch}
      />
    </div>
  );
}
