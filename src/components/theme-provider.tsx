"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Toggle de tema real (claro/escuro/sistema). O tema CLARO é o padrão na
 * primeira visita (é o tema principal do design), mas o usuário pode
 * alternar livremente — o estado persiste em localStorage via next-themes e
 * é lido pelo `ThemeToggle` (`src/components/theme-toggle.tsx`) na Topbar.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
