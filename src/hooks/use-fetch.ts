"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook simples de fetch: dispara um GET automaticamente ao montar (e sempre
 * que `url` mudar) e expõe `refetch` para reexecutar manualmente — usado
 * pelas páginas de CRUD após um POST/PATCH/DELETE feito diretamente com
 * `fetch` no componente.
 *
 * Mesmo padrão de `useDashboardData`: `loading` é derivado comparando a
 * chave da última requisição concluída (`completedKey`) com a chave da
 * requisição atual (`requestKey`, que inclui `url` e um contador bumpado
 * por `refetch`), em vez de setado sincronamente dentro do efeito — o que
 * evita o alerta do ESLint (React Compiler) sobre `setState` síncrono no
 * corpo de um efeito.
 */
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const requestKey = `${url}::${version}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json() as Promise<T>;
      })
      .then((json) => {
        setData(json);
        setError(null);
        setCompletedKey(requestKey);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Não foi possível carregar os dados. Tente novamente.");
        setCompletedKey(requestKey);
      });

    return () => controller.abort();
  }, [url, requestKey]);

  const loading = completedKey !== requestKey;

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, refetch };
}
