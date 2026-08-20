"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destino = searchParams.get("de") ?? "/";

  const [senha, setSenha] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim() || enviando) return;

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErro(body?.error ?? "Não foi possível entrar.");
        setSenha("");
        setEnviando(false);
        return;
      }

      // `refresh` faz o proxy revalidar a sessão antes de renderizar o destino.
      router.replace(destino);
      router.refresh();
    } catch {
      setErro("Erro de rede. Tente de novo.");
      setEnviando(false);
    }
  };

  return (
    <Card className="w-full max-w-sm gap-6 rounded-3xl p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Lock className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Finanças
          </h1>
          <p className="text-sm text-muted-foreground">
            Digite sua senha para acessar o painel.
          </p>
        </div>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={!!erro}
            aria-describedby={erro ? "erro-login" : undefined}
            className="h-11 rounded-full px-4"
          />
          {erro && (
            <p id="erro-login" role="alert" className="text-xs text-destructive">
              {erro}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={!senha.trim() || enviando}
          className="h-11 rounded-full font-semibold"
        >
          {enviando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-textura flex min-h-svh items-center justify-center bg-background p-4">
      <React.Suspense
        fallback={<Card className="h-80 w-full max-w-sm rounded-3xl" />}
      >
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
