"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * `true` somente depois da hidratação no client. Usa `useSyncExternalStore`
 * (em vez de `useState` + `setState` dentro de `useEffect`) porque não há
 * nenhuma fonte externa real pra "assinar" aqui — é só uma forma de detectar
 * "já montei no client" sem disparar um set-state síncrono dentro de um
 * effect (o que o React Compiler sinaliza como cascading render).
 */
function useHasMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * Toggle claro/escuro. Alterna apenas entre "light" e "dark" (mesmo que
 * `enableSystem` esteja ativo no provider) — um clique sempre inverte o
 * tema resolvido atual, que é o comportamento mais previsível pra um botão
 * de ícone único.
 *
 * Cuidado com hydration mismatch: `resolvedTheme` só é confiável depois de
 * montado no client (next-themes não sabe o tema real durante o SSR), então
 * seguramos um skeleton neutro até `mounted` ser true.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-full text-muted-foreground"
        disabled
        aria-hidden
      >
        <span className="size-4.5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark ? "Alternar para tema claro" : "Alternar para tema escuro"
      }
      className="relative overflow-hidden rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Moon className="size-4.5" />
          ) : (
            <Sun className="size-4.5" />
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
