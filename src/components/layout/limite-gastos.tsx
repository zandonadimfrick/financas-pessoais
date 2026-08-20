"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Gauge, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useEscopoStore } from "@/lib/store";
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

interface LimiteGastos {
  escopo: string;
  configurado: boolean;
  limite: number;
  gasto: number;
  restante: number;
  percentual: number;
  estourou: boolean;
  porEscopo: { escopo: "PF" | "PJ"; valor: number }[];
}

/** Verde tranquilo → coral em atenção → vermelho quando estoura. */
function corDaBarra(percentual: number, estourou: boolean) {
  if (estourou) return "bg-destructive";
  if (percentual >= 80) return "bg-primary";
  return "bg-income";
}

function DialogoLimite({
  open,
  onOpenChange,
  atual,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atual: LimiteGastos | null;
  onSalvo: () => void;
}) {
  const [escopo, setEscopo] = React.useState<"PF" | "PJ">("PF");
  const [valor, setValor] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const abrir = (aberto: boolean) => {
    if (aberto) {
      const doEscopo = atual?.porEscopo.find((l) => l.escopo === escopo);
      setValor(doEscopo ? String(doEscopo.valor) : "");
    }
    onOpenChange(aberto);
  };

  const trocarEscopo = (novo: "PF" | "PJ") => {
    setEscopo(novo);
    const doEscopo = atual?.porEscopo.find((l) => l.escopo === novo);
    setValor(doEscopo ? String(doEscopo.valor) : "");
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({ escopo, valor: numero }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar o limite.");
        return;
      }
      toast.success(
        numero === 0
          ? `Limite de ${escopo} removido.`
          : `Limite de ${escopo} definido em ${formatCurrency(numero)}.`
      );
      onOpenChange(false);
      onSalvo();
    } catch {
      toast.error("Erro de rede ao salvar o limite.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Limite de gastos</DialogTitle>
          <DialogDescription>
            Um teto mensal por escopo. Serve de alerta — nenhum lançamento é
            bloqueado por causa dele.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Escopo</Label>
            <Select value={escopo} onValueChange={(v) => trocarEscopo(v as "PF" | "PJ")}>
              <SelectTrigger className="h-9 w-full rounded-full px-3.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa física</SelectItem>
                <SelectItem value="PJ">Pessoa jurídica</SelectItem>
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
              placeholder="Ex: 5000,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-9 rounded-full px-3.5"
            />
            <p className="text-xs text-muted-foreground">
              Deixe 0 para desligar o alerta deste escopo.
            </p>
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
              disabled={salvando}
              className="rounded-full px-4 font-semibold"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Indicador de teto de gastos do mês, fixo no rodapé da barra lateral.
 * Reage ao filtro global de escopo: em "Todos", soma os orçamentos de PF e PJ.
 */
export function LimiteGastos({ className }: { className?: string }) {
  const escopo = useEscopoStore((s) => s.escopo);
  const [dados, setDados] = React.useState<LimiteGastos | null>(null);
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

  const percentualBarra = dados ? Math.min(dados.percentual, 100) : 0;

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl bg-secondary/70 p-3",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gauge className="size-3.5" aria-hidden />
            Limite do mês
          </span>
          <button
            type="button"
            onClick={() => setDialogoAberto(true)}
            aria-label="Definir limite de gastos"
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Pencil className="size-3" aria-hidden />
          </button>
        </div>

        {!dados ? (
          <div className="h-9 animate-pulse rounded-lg bg-muted" />
        ) : !dados.configurado ? (
          <button
            type="button"
            onClick={() => setDialogoAberto(true)}
            className="rounded-lg text-left text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Defina um teto mensal para acompanhar seus gastos.
          </button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "font-numeric text-sm font-semibold",
                  dados.estourou ? "text-destructive" : "text-foreground"
                )}
              >
                {formatCurrency(dados.gasto)}
              </span>
              <span className="font-numeric text-xs text-muted-foreground">
                de {formatCurrency(dados.limite)}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.round(dados.percentual)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Gastos do mês: ${Math.round(dados.percentual)}% do limite`}
              className="h-1.5 overflow-hidden rounded-full bg-border"
            >
              <motion.div
                className={cn("h-full rounded-full", corDaBarra(dados.percentual, dados.estourou))}
                initial={{ width: 0 }}
                animate={{ width: `${percentualBarra}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <p className="text-[0.7rem] text-muted-foreground">
              {dados.estourou ? (
                <span className="font-medium text-destructive">
                  {formatCurrency(Math.abs(dados.restante))} acima do limite
                </span>
              ) : (
                <>restam {formatCurrency(dados.restante)}</>
              )}
            </p>
          </div>
        )}
      </div>

      <DialogoLimite
        open={dialogoAberto}
        onOpenChange={setDialogoAberto}
        atual={dados}
        onSalvo={() => setRecarregar((n) => n + 1)}
      />
    </>
  );
}
