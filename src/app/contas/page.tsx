"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Archive, Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";

import { accountSchema } from "@/lib/validations";
import type { Account, TipoConta } from "@/lib/types";
import type { ArchiveOnDeleteResponse } from "@/lib/types";
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

import type { z } from "zod";

type FormValues = z.infer<typeof accountSchema>;

const TIPO_LABELS: Record<TipoConta, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  INVESTIMENTO: "Investimento",
  CARTEIRA: "Carteira",
};

const CORES_SUGERIDAS = [
  "#6366f1",
  "#a855f7",
  "#22d3ee",
  "#16a34a",
  "#e11d48",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
];

function emptyValues(escopoDefault: string | null): FormValues {
  return {
    nome: "",
    instituicao: "",
    tipo: "CORRENTE",
    escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
    saldoInicial: 0,
    cor: CORES_SUGERIDAS[0],
    icone: null,
    arquivada: false,
  };
}

function AccountFormDialog({
  open,
  onOpenChange,
  account,
  escopoDefault,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  escopoDefault: string | null;
  onSaved: () => void;
}) {
  const isEdit = !!account;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: emptyValues(escopoDefault),
  });

  React.useEffect(() => {
    if (!open) return;
    if (account) {
      reset({
        nome: account.nome,
        instituicao: account.instituicao,
        tipo: account.tipo,
        escopo: account.escopo,
        saldoInicial: account.saldoInicial,
        cor: account.cor,
        icone: account.icone,
        arquivada: account.arquivada,
      });
    } else {
      reset(emptyValues(escopoDefault));
    }
  }, [open, account, escopoDefault, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!values.escopo) {
      setError("escopo", { message: "Selecione um escopo (PF ou PJ)" });
      return;
    }

    const url = isEdit ? `/api/accounts/${account!.id}` : "/api/accounts";
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
          toast.error("Não foi possível salvar a conta.");
        }
        return;
      }

      toast.success(isEdit ? "Conta atualizada." : "Conta criada.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao salvar a conta.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da conta."
              : "Cadastre uma conta corrente, poupança, investimento ou carteira."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" placeholder="Ex: Nubank" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instituicao">Instituição</Label>
            <Input
              id="instituicao"
              placeholder="Ex: Nu Pagamentos"
              {...register("instituicao")}
            />
            {errors.instituicao && (
              <p className="text-xs text-destructive">
                {errors.instituicao.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "CORRENTE"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([value, label]) => (
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
                <p className="text-xs text-destructive">
                  {errors.escopo.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saldoInicial">Saldo inicial</Label>
              <Input
                id="saldoInicial"
                type="number"
                step="0.01"
                {...register("saldoInicial", { valueAsNumber: true })}
              />
              {errors.saldoInicial && (
                <p className="text-xs text-destructive">
                  {errors.saldoInicial.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <Controller
                control={control}
                name="cor"
                render={({ field }) => (
                  <div className="flex items-center gap-1.5">
                    {CORES_SUGERIDAS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "size-6 rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform",
                          field.value === c
                            ? "ring-foreground scale-110"
                            : "ring-transparent"
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
              <Label htmlFor="arquivada" className="cursor-pointer">
                Conta arquivada
              </Label>
              <Controller
                control={control}
                name="arquivada"
                render={({ field }) => (
                  <Switch
                    id="arquivada"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-accent text-white hover:opacity-90"
            >
              {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContasPage() {
  const escopo = useEscopoStore((s) => s.escopo);
  const [showArchived, setShowArchived] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Account | null>(null);

  const query = escopo !== "ALL" ? `?escopo=${escopo}` : "";
  const { data: accounts, loading, error, refetch } = useFetch<Account[]>(
    `/api/accounts${query}`
  );

  const visible = React.useMemo(
    () => (accounts ?? []).filter((a) => showArchived || !a.arquivada),
    [accounts, showArchived]
  );

  const handleDelete = async (account: Account) => {
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Não foi possível excluir a conta.");
        return;
      }
      const body = (await res.json()) as ArchiveOnDeleteResponse;
      toast.success(body.archived ? "Conta arquivada." : "Conta excluída.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir a conta.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Contas
          </h2>
          <p className="text-sm text-muted-foreground">
            Contas correntes, poupança, investimento e carteiras.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              size="sm"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            Mostrar arquivadas
          </label>
          <Button
            className="w-full bg-gradient-accent text-white hover:opacity-90 sm:w-auto"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova conta
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
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
          <Wallet className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma conta cadastrada ainda.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Criar primeira conta
          </Button>
        </Card>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((account) => (
            <Card
              key={account.id}
              className={cn(
                "gap-3 px-5 py-5",
                account.arquivada && "opacity-60"
              )}
              style={{
                borderTop: `3px solid ${account.cor}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${account.cor}26` }}
                  >
                    <Landmark
                      className="size-4.5"
                      style={{ color: account.cor }}
                    />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold">
                      {account.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.instituicao}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${account.nome}`}
                    onClick={() => {
                      setEditing(account);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${account.nome}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    title="Excluir conta?"
                    description={`"${account.nome}" será excluída. Se houver transações vinculadas, a conta será arquivada em vez de excluída.`}
                    onConfirm={() => handleDelete(account)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline">{TIPO_LABELS[account.tipo]}</Badge>
                <Badge variant={account.escopo === "PF" ? "secondary" : "outline"}>
                  {account.escopo}
                </Badge>
              </div>

              <p className="font-numeric text-xl font-semibold">
                {formatCurrency(account.saldoInicial)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  saldo inicial
                </span>
              </p>

              {account.arquivada && (
                <Badge variant="secondary" className="w-fit gap-1">
                  <Archive className="size-3" />
                  Arquivada
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        onSaved={refetch}
      />
    </div>
  );
}
