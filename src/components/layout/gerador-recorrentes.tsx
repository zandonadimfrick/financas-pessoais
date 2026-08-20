"use client";

import * as React from "react";
import { toast } from "sonner";

/**
 * Dispara a geração das cobranças recorrentes vencidas quando o app abre.
 *
 * Como não há agendador, é aqui que as assinaturas "acontecem": ao entrar no
 * sistema, tudo que venceu desde a última visita vira lançamento. A rota é
 * idempotente, então recarregar a página não duplica nada.
 *
 * Roda uma vez por sessão do navegador — recarregar a aba não repete a
 * chamada, e a próxima visita cobre o que vencer no meio-tempo.
 */
const CHAVE_SESSAO = "recorrentes-gerados";

export function GeradorRecorrentes() {
  React.useEffect(() => {
    if (sessionStorage.getItem(CHAVE_SESSAO)) return;
    sessionStorage.setItem(CHAVE_SESSAO, "1");

    fetch("/api/recurrings/gerar", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((resultado) => {
        if (!resultado?.criadas) return;
        toast.success(
          resultado.criadas === 1
            ? "1 cobrança recorrente lançada."
            : `${resultado.criadas} cobranças recorrentes lançadas.`,
          { description: "Assinaturas e recorrentes que venceram desde a última visita." }
        );
      })
      .catch(() => {
        // Silencioso de propósito: falhar aqui não deve atrapalhar o uso do
        // app, e a próxima visita tenta de novo.
      });
  }, []);

  return null;
}
