"use client";

import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEscopoStore, type Escopo } from "@/lib/store";
import { MobileSidebarTrigger, navItems } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="glass sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/70 px-3 sm:h-16 sm:gap-4 sm:px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileSidebarTrigger />
        <h1 className="truncate font-heading text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Tabs
          value={escopo}
          onValueChange={(value) => setEscopo(value as Escopo)}
        >
          <TabsList>
            <TabsTrigger value="PF">PF</TabsTrigger>
            <TabsTrigger value="PJ">PJ</TabsTrigger>
            <TabsTrigger value="ALL">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div
          aria-hidden
          className="hidden h-6 w-px bg-border sm:block"
        />

        <ThemeToggle />
      </div>
    </header>
  );
}
