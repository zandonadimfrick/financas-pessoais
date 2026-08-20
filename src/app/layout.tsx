import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/components/layout/page-transition";

const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontHeading = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Finanças — Painel Pessoal",
  description:
    "Painel pessoal de finanças: transações, contas, cartões, recebíveis e recorrentes em um só lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fontSans.variable} ${fontHeading.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-svh bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            {/* Fundo "aurora": blobs de gradiente suaves e desfocados */}
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
            >
              <div className="bg-accent-indigo absolute -top-40 -left-32 size-[32rem] rounded-full opacity-20 blur-[120px]" />
              <div className="bg-accent-violet absolute top-1/3 -right-40 size-[28rem] rounded-full opacity-15 blur-[120px]" />
              <div className="bg-accent-cyan absolute -bottom-40 left-1/4 size-[26rem] rounded-full opacity-10 blur-[120px]" />
            </div>

            {/*
              Shell full-bleed: sem max-w artificial aqui, pra telas grandes
              (>=1536px/1920px) usarem o espaço disponível. O padding da área
              de conteúdo escala por breakpoint — páginas de conteúdo podem
              impor seu próprio max-w interno se fizer sentido pra elas.
            */}
            <div className="flex min-h-svh w-full">
              <Sidebar />
              <div className="flex min-h-svh flex-1 flex-col">
                <Topbar />
                <main className="flex-1 p-4 md:p-6 xl:p-8 2xl:p-10">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
            </div>

            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
