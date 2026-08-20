"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpRight,
  FileText,
  Pencil,
  Plus,
  Repeat,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";

import { categorySchema, transactionSchema } from "@/lib/validations";
import type {
  Account,
  CardComResumo,
  Category,
  Transaction,
  TipoLancamento,
} from "@/lib/types";
import { useEscopoStore } from "@/lib/store";
import { parseLancamento } from "@/lib/parse-lancamento";
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
  /** Só usado ao criar: >1 divide a compra em parcelas mensais no cartão. */
  parcelas?: number;
  /** Só usado ao criar: marca como assinatura e passa a repetir todo mês. */
  assinatura?: boolean;
}

const NONE = "__none__";
const NEW_CATEGORY = "__new__";

/** Filtro de tipo em pílulas (substitui o antigo `Select` de Tipo). */
const TIPO_FILTROS: { value: "TODOS" | TipoLancamento; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "ENTRADA", label: "Entradas" },
  { value: "SAIDA", label: "Saídas" },
];

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
    parcelas: 1,
    assinatura: false,
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
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-lg">Nova categoria</DialogTitle>
          <DialogDescription>
            Categoria do tipo {tipo === "ENTRADA" ? "entrada" : "saída"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input
              id="categoria-nome"
              placeholder="Ex: Mercado"
              className="h-9 rounded-full px-3.5"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
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
  prefill,
  onSaved,
  onCategoryCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  cards: CardComResumo[];
  escopoDefault: string | null;
  /** Valores vindos do lançamento em linguagem natural, para conferência. */
  prefill: Partial<FormValues> | null;
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
  const cardSelecionado = watch("cardId");
  const parcelasSelecionadas = watch("parcelas") ?? 1;
  const valorInformado = watch("valor") ?? 0;
  const ehAssinatura = watch("assinatura") ?? false;
  const dataInformada = watch("data");

  // Numa compra parcelada o limite é tomado pelo valor CHEIO, não pela parcela.
  const cartaoEscolhido = cards.find((c) => c.id === cardSelecionado);
  const disponivelDoCartao = cartaoEscolhido?.resumo?.disponivel ?? 0;
  const estouraLimite =
    !!cartaoEscolhido &&
    tipoSelecionado === "SAIDA" &&
    valorInformado > 0 &&
    valorInformado > disponivelDoCartao;

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
      reset({ ...emptyValues(escopoDefault), ...(prefill ?? {}) });
    }
  }, [open, transaction, escopoDefault, prefill, reset]);

  const categoriasFiltradas = categories.filter((c) => c.tipo === tipoSelecionado);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
    const method = isEdit ? "PATCH" : "POST";

    // Parcelamento e assinatura só existem na criação; nenhum dos dois é
    // campo de transação, então não vão junto no corpo do PATCH/POST.
    const { parcelas, assinatura, ...resto } = values;
    const criarAssinatura = !isEdit && !!assinatura;
    const corpo =
      !isEdit && resto.cardId && !criarAssinatura && parcelas && parcelas > 1
        ? { ...resto, parcelas }
        : resto;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
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

      // Compra parcelada devolve o array de parcelas; as demais, um objeto.
      const resposta = (await res.json()) as Transaction | Transaction[];
      const parcelasCriadas = Array.isArray(resposta) ? resposta : null;
      const saved = parcelasCriadas ? parcelasCriadas[0] : (resposta as Transaction);

      /*
        A assinatura é criada DEPOIS da transação: este lançamento é a cobrança
        deste mês, e o recorrente cuida das próximas. Se falhar, o lançamento
        continua valendo — só o "repete todo mês" não é ativado, e o usuário é
        avisado disso.
      */
      let assinaturaCriada = false;
      if (criarAssinatura) {
        const diaCobranca = Number(resto.data.slice(8, 10)) || 1;
        try {
          const resAssinatura = await fetch("/api/recurrings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: resto.descricao,
              valor: resto.valor,
              tipo: resto.tipo,
              periodicidade: "MENSAL",
              diaCobranca,
              escopo: resto.escopo,
              ativo: true,
              categoryId: resto.categoryId,
              cardId: resto.cardId,
              accountId: resto.accountId,
            }),
          });
          assinaturaCriada = resAssinatura.ok;
          if (!resAssinatura.ok) {
            toast.error(
              "Lançamento salvo, mas não consegui criar a assinatura recorrente."
            );
          }
        } catch {
          toast.error(
            "Lançamento salvo, mas não consegui criar a assinatura recorrente."
          );
        }
      }

      const mensagem = isEdit
        ? "Transação atualizada."
        : assinaturaCriada
          ? "Assinatura criada."
          : parcelasCriadas
            ? `Compra em ${parcelasCriadas.length}× registrada.`
            : "Transação criada.";

      toast.success(mensagem, {
        description: assinaturaCriada
          ? `${formatCurrency(values.valor)} todo mês no dia ${resto.data.slice(8, 10)}.`
          : parcelasCriadas
            ? `${formatCurrency(values.valor)} comprometidos no limite do cartão.`
            : undefined,
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
        <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isEdit ? "Editar transação" : "Nova transação"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize os dados do lançamento."
                : "Registre uma entrada ou saída."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Ex: Supermercado"
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
                  placeholder="Ex: 150,00"
                  className="h-9 rounded-full px-3.5"
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
                      <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  className="h-9 rounded-full px-3.5"
                  {...register("data")}
                />
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
                    <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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
                      <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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

            {/*
              Assinatura: transforma o lançamento em cobrança recorrente mensal
              no mesmo dia escolhido. Só ao criar — mexer nisso ao editar uma
              cobrança já gerada bagunçaria o histórico.
            */}
            {!isEdit && tipoSelecionado === "SAIDA" && (
              <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="assinatura" className="flex items-center gap-2 text-sm">
                    <Repeat className="size-4 text-muted-foreground" aria-hidden />
                    É uma assinatura
                  </Label>
                  <Controller
                    control={control}
                    name="assinatura"
                    render={({ field }) => (
                      <Switch
                        id="assinatura"
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                {ehAssinatura && (
                  <p className="text-xs text-muted-foreground">
                    Repete todo mês no dia{" "}
                    <span className="font-semibold text-foreground">
                      {dataInformada ? dataInformada.slice(8, 10) : "—"}
                    </span>
                    {cardSelecionado
                      ? " no cartão escolhido, e aparece no total de assinaturas dele."
                      : ", e as próximas cobranças são lançadas sozinhas."}
                  </p>
                )}
              </div>
            )}

            {/*
              Parcelamento só existe em compra no cartão, e só ao criar: editar
              uma parcela solta reabriria a porta pra compra ficar inconsistente.
            */}
            {!isEdit && cardSelecionado && !ehAssinatura && (
              <div className="flex flex-col gap-1.5 rounded-2xl bg-secondary/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="parcelas" className="text-sm">
                    Parcelas
                  </Label>
                  <Input
                    id="parcelas"
                    type="number"
                    min={1}
                    max={48}
                    className="h-9 w-24 rounded-full px-3.5 text-center"
                    {...register("parcelas", { valueAsNumber: true })}
                  />
                </div>
                {parcelasSelecionadas > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {valorInformado > 0 ? (
                      <>
                        {parcelasSelecionadas}× de{" "}
                        <span className="font-numeric font-semibold text-foreground">
                          {formatCurrency(valorInformado / parcelasSelecionadas)}
                        </span>{" "}
                        — o valor acima é o total da compra, e os{" "}
                        {formatCurrency(valorInformado)} comprometem o limite do
                        cartão desde já.
                      </>
                    ) : (
                      "Informe o valor total da compra — ele será dividido nas parcelas."
                    )}
                  </p>
                )}
                {errors.parcelas && (
                  <p className="text-xs text-destructive">{errors.parcelas.message}</p>
                )}
              </div>
            )}

            {/*
              Aviso, não trava: o usuário pediu explicitamente para poder
              lançar acima do limite e apenas ser avisado.
            */}
            {!isEdit && estouraLimite && (
              <p className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                <span>
                  Isso ultrapassa o limite disponível do cartão (
                  {formatCurrency(disponivelDoCartao)}). O lançamento será
                  registrado mesmo assim.
                </span>
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                rows={2}
                placeholder="Ex: Compra parcelada em 3x no cartão Nubank"
                className="rounded-2xl px-3.5 py-2.5"
                {...register("observacao")}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
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
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Transferência entre contas</DialogTitle>
          <DialogDescription>
            Move dinheiro de uma conta sua pra outra — não conta como entrada nem saída real
            nos relatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-valor">Valor</Label>
              <Input
                id="transfer-valor"
                type="number"
                step="0.01"
                placeholder="Ex: 500,00"
                className="h-9 rounded-full px-3.5"
                value={values.valor}
                onChange={(e) => setValues((v) => ({ ...v, valor: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-data">Data</Label>
              <Input
                id="transfer-data"
                type="date"
                className="h-9 rounded-full px-3.5"
                value={values.data}
                onChange={(e) => setValues((v) => ({ ...v, data: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>De (origem)</Label>
              <Select
                value={values.contaOrigemId}
                onValueChange={(v) => setValues((s) => ({ ...s, contaOrigemId: v ?? "" }))}
              >
                <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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
                <SelectTrigger className="h-9 w-full rounded-full px-3.5">
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
              className="rounded-2xl px-3.5 py-2.5"
              value={values.observacao}
              onChange={(e) => setValues((v) => ({ ...v, observacao: e.target.value }))}
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

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
              disabled={submitting}
              className="rounded-full px-4 font-semibold"
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
  const [prefill, setPrefill] = React.useState<Partial<FormValues> | null>(null);
  const [frase, setFrase] = React.useState("");

  const [filters, setFilters] = React.useState({
    busca: "",
    from: "",
    to: "",
    tipo: "TODOS" as "TODOS" | TipoLancamento,
    categoryId: NONE,
    accountId: NONE,
    cardId: NONE,
  });

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (escopo !== "ALL") params.set("escopo", escopo);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
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
  const { data: cards } = useFetch<CardComResumo[]>(
    `/api/cards?resumo=1${accountsQuery.replace("?", "&")}`
  );

  /*
    Busca geral, aplicada no cliente sobre o resultado já filtrado pela API:
    varre descrição, categoria, conta, cartão, observação e a data (tanto no
    formato dd/mm/aaaa quanto aaaa-mm-dd), então dá pra procurar tanto por
    "mercado" quanto por "05/08".
  */
  const list = React.useMemo(() => {
    const todas = transactions ?? [];
    const termo = filters.busca.trim().toLowerCase();
    if (!termo) return todas;

    return todas.filter((t) => {
      const iso = t.data.slice(0, 10);
      const campos = [
        t.descricao,
        t.category?.nome,
        t.account?.nome,
        t.card?.nome,
        t.observacao,
        iso,
        formatDateBR(iso),
        formatCurrency(t.valor),
      ];
      return campos.some((campo) => campo?.toLowerCase().includes(termo));
    });
  }, [transactions, filters.busca]);

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
    filters.busca ||
    filters.from ||
    filters.to ||
    filters.tipo !== "TODOS" ||
    filters.categoryId !== NONE ||
    filters.accountId !== NONE ||
    filters.cardId !== NONE;

  /*
    Lançamento por frase: interpreta e ABRE O FORMULÁRIO preenchido, nunca
    salva direto — errar o valor ou a conta sem o usuário ver seria pior que
    digitar tudo à mão.
  */
  const interpretarFrase = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = frase.trim();
    if (!texto) return;

    const resultado = parseLancamento(texto, {
      contas: (accounts ?? []).map((a) => ({ id: a.id, nome: a.nome })),
      cartoes: (cards ?? []).map((c) => ({ id: c.id, nome: c.nome })),
      categorias: (categories ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
      })),
    });

    if (resultado.valor === null) {
      toast.error("Não encontrei um valor na frase.", {
        description: "Tente algo como “gastei 25 na padaria hoje”.",
      });
      return;
    }

    setEditing(null);
    setPrefill({
      descricao: resultado.descricao,
      valor: resultado.valor,
      tipo: resultado.tipo,
      data: resultado.data,
      categoryId: resultado.categoryId,
      accountId: resultado.accountId,
      cardId: resultado.cardId,
    });
    setDialogOpen(true);
    setFrase("");

    toast.success("Confira os campos antes de salvar.", {
      description: resultado.entendido.join(" · "),
    });
  };

  const limparFiltros = () =>
    setFilters({
      busca: "",
      from: "",
      to: "",
      tipo: "TODOS",
      categoryId: NONE,
      accountId: NONE,
      cardId: NONE,
    });

  /*
    Chips removíveis dos filtros ativos. O filtro de Tipo fica de fora porque
    já aparece destacado nas pílulas Todos/Entradas/Saídas logo acima.
  */
  const filterChips: { key: string; label: string; onClear: () => void }[] = [];
  if (filters.busca) {
    filterChips.push({
      key: "busca",
      label: `“${filters.busca}”`,
      onClear: () => setFilters((f) => ({ ...f, busca: "" })),
    });
  }
  if (filters.from) {
    filterChips.push({
      key: "from",
      label: `Desde ${formatDateBR(filters.from)}`,
      onClear: () => setFilters((f) => ({ ...f, from: "" })),
    });
  }
  if (filters.to) {
    filterChips.push({
      key: "to",
      label: `Até ${formatDateBR(filters.to)}`,
      onClear: () => setFilters((f) => ({ ...f, to: "" })),
    });
  }
  const categoriaFiltro = (categories ?? []).find((c) => c.id === filters.categoryId);
  if (categoriaFiltro) {
    filterChips.push({
      key: "categoria",
      label: categoriaFiltro.nome,
      onClear: () => setFilters((f) => ({ ...f, categoryId: NONE })),
    });
  }
  const contaFiltro = (accounts ?? []).find((a) => a.id === filters.accountId);
  if (contaFiltro) {
    filterChips.push({
      key: "conta",
      label: contaFiltro.nome,
      onClear: () => setFilters((f) => ({ ...f, accountId: NONE })),
    });
  }
  const cartaoFiltro = (cards ?? []).find((c) => c.id === filters.cardId);
  if (cartaoFiltro) {
    filterChips.push({
      key: "cartao",
      label: cartaoFiltro.nome,
      onClear: () => setFilters((f) => ({ ...f, cardId: NONE })),
    });
  }

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
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Transações
          </h2>
          <p className="text-sm text-muted-foreground">
            Tudo que entrou e saiu, em um lugar só.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full px-4 sm:w-auto"
            onClick={() => setTransferOpen(true)}
          >
            <ArrowRightLeft className="size-4" />
            Transferência
          </Button>
          <Button
            size="lg"
            className="w-full rounded-full px-4 font-semibold sm:w-auto"
            onClick={() => {
              setEditing(null);
              setPrefill(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova transação
          </Button>
        </div>
      </div>

      {/* Lançamento por frase */}
      <Card className="gap-2 border-primary/25 bg-primary/5 px-4 py-4 md:px-5">
        <form onSubmit={interpretarFrase} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Sparkles
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Input
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              placeholder="Ex: gastei 25 na padaria hoje no cartão Nubank"
              aria-label="Descrever o lançamento em uma frase"
              className="h-11 rounded-full border-transparent bg-card pl-11"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!frase.trim()}
            className="rounded-full px-5 font-semibold"
          >
            Interpretar
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Escreva o lançamento do seu jeito — o formulário abre preenchido para você
          conferir antes de salvar.
        </p>
      </Card>

      {/* Filtros */}
      <Card className="gap-4 px-4 py-4 md:px-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filters.busca}
            onChange={(e) => setFilters((f) => ({ ...f, busca: e.target.value }))}
            placeholder="Buscar por descrição, categoria, conta, valor ou data…"
            aria-label="Buscar nas transações"
            className="h-11 rounded-full pl-11"
          />
        </div>

        {/* Tipo vira pílula: são só três opções, e assim fica num toque só. */}
        <div
          role="group"
          aria-label="Filtrar por tipo"
          className="inline-flex w-fit rounded-full bg-secondary p-1"
        >
          {TIPO_FILTROS.map((opt) => {
            const ativo = filters.tipo === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFilters((f) => ({ ...f, tipo: opt.value }))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  ativo
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-de" className="text-xs text-muted-foreground">
              A partir de
            </Label>
            <Input
              id="filtro-de"
              type="date"
              max={filters.to || undefined}
              className="h-9 rounded-full border-transparent bg-secondary px-3.5"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-ate" className="text-xs text-muted-foreground">
              Até
            </Label>
            <Input
              id="filtro-ate"
              type="date"
              min={filters.from || undefined}
              className="h-9 rounded-full border-transparent bg-secondary px-3.5"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select
              value={filters.categoryId}
              onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v ?? NONE }))}
            >
              <SelectTrigger className="h-9 w-full rounded-full border-transparent bg-secondary px-3.5">
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
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Conta</Label>
            <Select
              value={filters.accountId}
              onValueChange={(v) => setFilters((f) => ({ ...f, accountId: v ?? NONE }))}
            >
              <SelectTrigger className="h-9 w-full rounded-full border-transparent bg-secondary px-3.5">
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
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Cartão</Label>
            <Select
              value={filters.cardId}
              onValueChange={(v) => setFilters((f) => ({ ...f, cardId: v ?? NONE }))}
            >
              <SelectTrigger className="h-9 w-full rounded-full border-transparent bg-secondary px-3.5">
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
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {filterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-xs font-medium text-foreground"
              >
                {chip.label}
                <button
                  type="button"
                  aria-label={`Remover filtro ${chip.label}`}
                  onClick={chip.onClear}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={limparFiltros}
            >
              Limpar tudo
            </Button>
          </div>
        )}
      </Card>

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          <Card className="gap-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ArrowDownLeft className="size-4" />
              </span>
              <p className="text-xs font-medium text-muted-foreground">
                Entradas no filtro
              </p>
            </div>
            <p className="font-numeric text-2xl font-semibold text-income">
              +{formatCurrency(totals.entradas)}
            </p>
          </Card>
          <Card className="gap-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ArrowUpRight className="size-4" />
              </span>
              <p className="text-xs font-medium text-muted-foreground">
                Saídas no filtro
              </p>
            </div>
            <p className="font-numeric text-2xl font-semibold text-expense">
              -{formatCurrency(totals.saidas)}
            </p>
          </Card>
          <Card className="gap-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Wallet className="size-4" />
              </span>
              <p className="text-xs font-medium text-muted-foreground">
                Saldo no filtro
              </p>
            </div>
            <p
              className={cn(
                "font-numeric text-2xl font-semibold",
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
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <ArrowLeftRight className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-base font-semibold">
              {hasActiveFilters ? "Nada com esses filtros" : "Nenhuma transação ainda"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Ajuste ou limpe os filtros pra ver seus lançamentos."
                : "Registre a primeira entrada ou saída pra começar."}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-4"
              onClick={limparFiltros}
            >
              <X className="size-4" />
              Limpar filtros
            </Button>
          ) : (
            <Button
              size="lg"
              className="rounded-full px-4 font-semibold"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Registrar primeira transação
            </Button>
          )}
        </Card>
      )}

      {!loading && !error && list.length > 0 && (
        <>
          {/*
            Mobile: lista de cards (ícone circular + descrição + valor à
            direita). Tabela em tela pequena obriga rolagem horizontal, então
            ela só aparece a partir de `md`.
          */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {list.map((t) => {
              const entrada = t.tipo === "ENTRADA";
              const subtitulo = [
                t.category?.nome,
                t.account?.nome ?? t.card?.nome,
                formatDateBR(t.data.slice(0, 10)),
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/10"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        entrada
                          ? "bg-income/10 text-income"
                          : "bg-primary/10 text-expense"
                      )}
                    >
                      {entrada ? (
                        <ArrowDownLeft className="size-4.5" />
                      ) : (
                        <ArrowUpRight className="size-4.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.descricao}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {subtitulo}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "font-numeric text-sm font-semibold",
                          entrada ? "text-income" : "text-expense"
                        )}
                      >
                        {entrada ? "+" : "-"}
                        {formatCurrency(t.valor)}
                      </span>
                      {!t.efetivado && (
                        <span className="text-[0.65rem] font-medium text-muted-foreground">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground"
                      render={<Link href={`/documentos?transactionId=${t.id}`} />}
                      aria-label={`Ver documentos de ${t.descricao}`}
                    >
                      <FileText className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground"
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground"
                          aria-label={`Excluir ${t.descricao}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      title="Excluir transação?"
                      description={`"${t.descricao}" será excluída permanentemente.`}
                      onConfirm={() => handleDelete(t)}
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
                    Data
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Categoria
                  </TableHead>
                  <TableHead className="h-11 px-5 text-xs font-medium text-muted-foreground">
                    Conta/Cartão
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
                {list.map((t) => (
                  <TableRow key={t.id} className="border-border/60">
                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      {formatDateBR(t.data.slice(0, 10))}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 font-medium">
                      {t.descricao}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      {t.category ? (
                        <Badge variant="secondary">{t.category.nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      {t.account?.nome ?? t.card?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <Badge variant={t.efetivado ? "secondary" : "outline"}>
                        {t.efetivado ? "Efetivado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-5 py-3.5 text-right font-numeric font-semibold",
                        t.tipo === "ENTRADA" ? "text-income" : "text-expense"
                      )}
                    >
                      {t.tipo === "ENTRADA" ? "+" : "-"}
                      {formatCurrency(t.valor)}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground"
                          render={<Link href={`/documentos?transactionId=${t.id}`} />}
                          aria-label={`Ver documentos de ${t.descricao}`}
                          title="Ver documentos"
                        >
                          <FileText className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground"
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
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full text-muted-foreground"
                              aria-label={`Excluir ${t.descricao}`}
                            >
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
        </>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={(aberto) => {
          setDialogOpen(aberto);
          // O preenchimento vale só para a abertura atual: reabrir pelo botão
          // "Nova transação" tem que vir com o formulário limpo.
          if (!aberto) setPrefill(null);
        }}
        transaction={editing}
        categories={categories ?? []}
        accounts={accounts ?? []}
        cards={cards ?? []}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        prefill={prefill}
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
