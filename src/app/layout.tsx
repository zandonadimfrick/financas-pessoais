import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
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
      <body className="bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            {/*
              Shell no estilo da referência: a página inteira é o cinza
              `--background` e o app vive dentro de um "painel" branco
              (`bg-card`) com cantos bem arredondados e uma margem ao redor em
              telas md+. No mobile o painel ocupa a tela toda, sem margem nem
              raio, pra não desperdiçar espaço.

              Full-bleed de propósito: nenhum `max-w` aqui, pra telas grandes
              usarem o espaço disponível. Páginas podem impor seu próprio
              `max-w` interno se fizer sentido pra elas.
            */}
            <div className="flex h-svh w-full flex-col md:p-3">
              <div className="flex min-h-0 flex-1 overflow-hidden bg-card md:rounded-[2rem] md:ring-1 md:ring-foreground/8">
                <Sidebar />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <Topbar />
                  {/*
                    A área de conteúdo é o container de rolagem do app. O
                    `pb-28` no mobile reserva espaço pra barra de navegação
                    inferior fixa.
                  */}
                  <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-6 xl:p-8 2xl:p-10">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </div>
              </div>
            </div>

            <MobileNav />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
