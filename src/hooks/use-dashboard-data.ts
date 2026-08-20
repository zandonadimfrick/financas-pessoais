"use client";

import { useEffect, useState } from "react";

import { useEscopoStore } from "@/lib/store";
import type { DashboardData, DashboardRange } from "@/components/dashboard/types";

/**
 * Busca os dados agregados do dashboard (`GET /api/dashboard`) para o
 * `range` informado, reagindo automaticamente a trocas do escopo global
 * (PF/PJ/Todos) selecionado na Topbar.
 *
 * Mantém os últimos dados carregados visíveis durante um refetch (troca de
 * aba ou de escopo): `isFetching` é derivado comparando a chave da última
 * requisição concluída com a chave da requisição atual, em vez de resetado
 * sincronamente dentro do efeito.
 */
export function useDashboardData(range: DashboardRange) {
  const escopo = useEscopoStore((state) => state.escopo);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);

  const requestKey = `${range}:${escopo}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range, scope: escopo });

    fetch(`/api/dashboard?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar dados do dashboard");
        return res.json() as Promise<DashboardData>;
      })
      .then((json) => {
        setData(json);
        setError(null);
        setCompletedKey(requestKey);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Não foi possível carregar o dashboard. Tente novamente.");
        setCompletedKey(requestKey);
      });

    return () => controller.abort();
  }, [range, escopo, requestKey]);

  const isFetching = completedKey !== requestKey;

  return {
    data,
    isLoading: isFetching && data === null,
    isFetching,
    error,
  };
}
