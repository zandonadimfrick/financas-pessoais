import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { GeradorRecorrentes } from "@/components/layout/gerador-recorrentes";

/**
 * Shell do app autenticado. Fica num grupo de rotas para que `/login` — que
 * não deve mostrar barra lateral nem navegação — continue usando só o layout
 * raiz.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/*
        Shell no estilo da referência: a página inteira é o cinza
        `--background` e o app vive dentro de um "painel" branco (`bg-card`)
        com cantos bem arredondados e uma margem ao redor em telas md+. No
        mobile o painel ocupa a tela toda, sem margem nem raio, pra não
        desperdiçar espaço.

        Full-bleed de propósito: nenhum `max-w` aqui, pra telas grandes usarem
        o espaço disponível. Páginas podem impor seu próprio `max-w` interno
        se fizer sentido pra elas.
      */}
      <div className="bg-textura flex h-svh w-full flex-col md:p-3">
        <div className="flex min-h-0 flex-1 overflow-hidden bg-card md:rounded-[2rem] md:ring-1 md:ring-foreground/8">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Topbar />
            {/*
              A área de conteúdo é o container de rolagem do app. O `pb-28` no
              mobile reserva espaço pra barra de navegação inferior fixa.
            */}
            <main className="bg-textura min-h-0 flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-6 xl:p-8 2xl:p-10">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </div>

      <MobileNav />
      <GeradorRecorrentes />
    </>
  );
}
