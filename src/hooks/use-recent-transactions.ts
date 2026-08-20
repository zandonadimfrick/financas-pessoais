"use client";

import { useEffect, useState } from "react";

import { useEscopoStore } from "@/lib/store";
import type { TransactionListItem } from "@/components/dashboard/types";

/**
 * Busca as transações mais recentes (`GET /api/transactions`), sem filtro
 * de data, respeitando o escopo global (PF/PJ/Todos). O limite é aplicado
 * no client, já que a API não recebe `limit`.
 */
export function useRecentTransactions(limit = 8) {
  const escopo = useEscopoStore((state) => state.escopo);
  const [items, setItems] = useState<TransactionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);

  const requestKey = `${escopo}:${limit}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (escopo !== "ALL") params.set("escopo", escopo);

    fetch(`/api/transactions?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar transações");
        return res.json() as Promise<TransactionListItem[]>;
      })
      .then((json) => {
        setItems(json.slice(0, limit));
        setError(null);
        setCompletedKey(requestKey);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Não foi possível carregar as transações recentes.");
        setCompletedKey(requestKey);
      });

    return () => controller.abort();
  }, [escopo, limit, requestKey]);

  const isLoading = completedKey !== requestKey && items === null;

  return { items, isLoading, error };
}
