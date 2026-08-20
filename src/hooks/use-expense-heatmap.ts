"use client";

import { useEffect, useState } from "react";

import { useEscopoStore } from "@/lib/store";
import type { HeatmapData, HeatmapGranularity } from "@/components/dashboard/types";

/**
 * Busca os buckets do heatmap de gastos (`GET /api/dashboard/heatmap`) para
 * a `granularity`/`year` informados, reagindo automaticamente a trocas do
 * escopo global (PF/PJ/Todos).
 *
 * Mesmo padrão de `useDashboardData`: `isFetching` é derivado comparando a
 * chave da última requisição concluída com a chave da requisição atual, em
 * vez de setado sincronamente dentro do efeito (regra de lint
 * `react-hooks/set-state-in-effect`).
 */
export function useExpenseHeatmap(granularity: HeatmapGranularity, year: number) {
  const escopo = useEscopoStore((state) => state.escopo);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);

  const requestKey = `${granularity}:${year}:${escopo}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ granularity, scope: escopo });
    if (granularity !== "year") params.set("year", String(year));

    fetch(`/api/dashboard/heatmap?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar heatmap de gastos");
        return res.json() as Promise<HeatmapData>;
      })
      .then((json) => {
        setData(json);
        setError(null);
        setCompletedKey(requestKey);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Não foi possível carregar o heatmap. Tente novamente.");
        setCompletedKey(requestKey);
      });

    return () => controller.abort();
  }, [granularity, year, escopo, requestKey]);

  const isFetching = completedKey !== requestKey;

  return {
    data,
    isLoading: isFetching && data === null,
    isFetching,
    error,
  };
}
