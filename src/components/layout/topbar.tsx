"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEscopoStore, type Escopo } from "@/lib/store";
import { MobileSidebarTrigger, navItems } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";

function useCurrentPageTitle() {
  const pathname = usePathname();
  const current = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  return current?.label ?? "Finanças";
}

export function Topbar() {
  const title = useCurrentPageTitle();
  const escopo = useEscopoStore((state) => state.escopo);
  const setEscopo = useEscopoStore((state) => state.setEscopo);

  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/85 px-3 sm:h-20 sm:gap-4 sm:px-5 md:rounded-tr-[2rem] md:px-8">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <MobileSidebarTrigger />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Finanças
          </span>
          <h1 className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <Tabs
          value={escopo}
          onValueChange={(value) => setEscopo(value as Escopo)}
        >
          <TabsList className="rounded-full bg-secondary p-1">
            <TabsTrigger
              value="PF"
              className="rounded-full px-3 data-active:bg-foreground data-active:text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:text-background"
            >
              PF
            </TabsTrigger>
            <TabsTrigger
              value="PJ"
              className="rounded-full px-3 data-active:bg-foreground data-active:text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:text-background"
            >
              PJ
            </TabsTrigger>
            <TabsTrigger
              value="ALL"
              className="rounded-full px-3 data-active:bg-foreground data-active:text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:text-background"
            >
              Todos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div aria-hidden className="hidden h-6 w-px bg-border sm:block" />

        <ThemeToggle />

        <LogoutButton />

        {/* Atalho pra registrar uma nova transação — o "+" circular da referência. */}
        <Link
          href="/transacoes"
          aria-label="Nova transação"
          title="Nova transação"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-10"
        >
          <Plus className="size-5" />
        </Link>
      </div>
    </header>
  );
}
