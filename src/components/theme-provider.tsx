"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Toggle de tema real (claro/escuro/sistema). Dark continua sendo o padrão
 * na primeira visita, mas o usuário pode alternar livremente — o estado
 * persiste em localStorage via next-themes e é lido pelo `ThemeToggle`
 * (`src/components/theme-toggle.tsx`) na Topbar.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
