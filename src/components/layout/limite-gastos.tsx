"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Gauge, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useEscopoStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface LimiteCategoria {
  categoryId: string;
  nome: string;
  cor: string;
  limite: number;
  gasto: number;
  restante: number;
  percentual: number;
  estourou: boolean;
}

interface LimitesGastos {
  configurado: boolean;
  categorias: LimiteCategoria[];
  totalLimite: number;
  totalGasto: number;
  estourou: boolean;
}

/** Verde tranquilo → coral em atenção → vermelho quando estoura. */
function corDaBarra(percentual: number, estourou: boolean) {
  if (estourou) return "bg-destructive";
  if (percentual >= 80) return "bg-primary";
  return "bg-income";
}

function LinhaCategoria({ item }: { item: LimiteCategoria }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.cor }}
          />
          <span className="truncate text-[0.7rem] text-foreground/90">
            {item.nome}
          </span>
        </span>
        <span
          className={cn(
            "font-numeric shrink-0 text-[0.7rem]",
            item.estourou ? "font-semibold text-destructive" : "text-muted-foreground"
          )}
        >
          {formatCurrency(item.gasto)}
          <span className="text-muted-foreground"> / {formatCurrency(item.limite)}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(item.percentual)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.nome}: ${Math.round(item.percentual)}% do limite usado`}
        className="h-1 overflow-hidden rounded-full bg-border"
      >
        <motion.div
          className={cn("h-full rounded-full", corDaBarra(item.percentual, item.estourou))}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(item.percentual, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function DialogoLimites({
  open,
  onOpenChange,
  dados,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dados: LimitesGastos | null;
  onSalvo: () => void;
}) {
  const [categorias, setCategorias] = React.useState<Category[]>([]);
  const [categoryId, setCategoryId] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const abrir = (aberto: boolean) => {
    if (aberto) {
      setCategoryId("");
      setValor("");
      fetch("/api/categories?tipo=SAIDA")
        .then((r) => (r.ok ? r.json() : []))
        .then(setCategorias)
        .catch(() => setCategorias([]));
    }
    onOpenChange(aberto);
  };

  // Ao escolher uma categoria que já tem teto, mostra o valor atual.
  const escolherCategoria = (id: string | null) => {
    setCategoryId(id ?? "");
    const existente = dados?.categorias.find((c) => c.categoryId === id);
    setValor(existente ? String(existente.limite) : "");
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Escolha uma categoria.");
      return;
    }
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero < 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/spending-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, valor: numero }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar o limite.");
        return;
      }
      toast.success(numero === 0 ? "Limite removido." : "Limite salvo.");
      setCategoryId("");
      setValor("");
      onSalvo();
    } catch {
      toast.error("Erro de rede ao salvar o limite.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (item: LimiteCategoria) => {
    try {
      const res = await fetch("/api/spending-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: item.categoryId, valor: 0 }),
      });
      if (!res.ok) {
        toast.error("Não foi possível remover o limite.");
        return;
      }
      toast.success(`Limite de ${item.nome} removido.`);
      onSalvo();
    } catch {
      toast.error("Erro de rede ao remover o limite.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Limites por categoria</DialogTitle>
          <DialogDescription>
            Um teto mensal para cada categoria — por exemplo, R$ 250 de
            Transporte. É um alerta: nenhum lançamento é bloqueado.
          </DialogDescription>
        </DialogHeader>

        {dados && dados.categorias.length > 0 && (
          <ul className="flex flex-col gap-2">
            {dados.categorias.map((item) => (
              <li
                key={item.categoryId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.cor }}
                  />
                  <span className="truncate text-sm">{item.nome}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-numeric text-sm font-medium">
                    {formatCurrency(item.limite)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(item)}
                    aria-label={`Remover limite de ${item.nome}`}
                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={salvar} className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={escolherCategoria}>
                <SelectTrigger className="h-9 w-full rounded-full px-3.5">
                  <SelectValue placeholder="Escolher" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="limite-valor">Teto mensal</Label>
              <Input
                id="limite-valor"
                type="number"
                step="0.01"
                min={0}
                placeholder="Ex: 250,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-9 rounded-full px-3.5"
              />
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={salvando}
              className="rounded-full px-4 font-semibold"
            >
              {salvando ? "Salvando…" : "Salvar limite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Limites de gasto por categoria, no rodapé da barra lateral. Mostra as três
 * categorias mais perto de estourar — o resto fica no diálogo, para a barra
 * não virar uma lista sem fim.
 */
export function LimiteGastos({ className }: { className?: string }) {
  const escopo = useEscopoStore((s) => s.escopo);
  const [dados, setDados] = React.useState<LimitesGastos | null>(null);
  const [dialogoAberto, setDialogoAberto] = React.useState(false);
  const [recarregar, setRecarregar] = React.useState(0);

  React.useEffect(() => {
    let cancelado = false;
    fetch(`/api/spending-limit?escopo=${escopo}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelado) setDados(json);
      })
      .catch(() => {
        if (!cancelado) setDados(null);
      });
    return () => {
      cancelado = true;
    };
  }, [escopo, recarregar]);

  const visiveis = dados?.categorias.slice(0, 3) ?? [];
  const restantes = (dados?.categorias.length ?? 0) - visiveis.length;

  return (
    <>
      <div className={cn("flex flex-col gap-2.5 rounded-2xl bg-secondary/70 p-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gauge className="size-3.5" aria-hidden />
            Limites do mês
          </span>
          <button
            type="button"
            onClick={() => setDialogoAberto(true)}
            aria-label="Gerenciar limites por categoria"
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>

        {!dados ? (
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        ) : !dados.configurado ? (
          <button
            type="button"
            onClick={() => setDialogoAberto(true)}
            className="rounded-lg text-left text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Defina um teto por categoria, como R$ 250 de Transporte.
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visiveis.map((item) => (
              <LinhaCategoria key={item.categoryId} item={item} />
            ))}

            {restantes > 0 && (
              <button
                type="button"
                onClick={() => setDialogoAberto(true)}
                className="rounded-lg text-left text-[0.7rem] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                +{restantes} {restantes === 1 ? "categoria" : "categorias"}
              </button>
            )}
          </div>
        )}
      </div>

      <DialogoLimites
        open={dialogoAberto}
        onOpenChange={setDialogoAberto}
        dados={dados}
        onSalvo={() => setRecarregar((n) => n + 1)}
      />
    </>
  );
}
