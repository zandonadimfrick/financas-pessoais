"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  Repeat,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LimiteGastos } from "@/components/layout/limite-gastos";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/recebiveis", label: "A Receber", icon: HandCoins },
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/documentos", label: "Documentos", icon: FileText },
] as const;

function isItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Marca: disco escuro com monograma + título em duas linhas, no estilo da
 * referência. O disco usa `bg-foreground`/`text-background`, então ele
 * inverte sozinho no tema escuro (círculo claro, letra escura).
 */
function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-2xl px-2 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <span className="font-heading text-base leading-none font-bold">F</span>
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-heading text-base font-semibold tracking-tight text-foreground">
          Finanças
        </span>
        <span className="truncate text-xs text-muted-foreground">
          Painel Pessoal
        </span>
      </span>
    </Link>
  );
}

function NavList({
  pathname,
  layoutIdPrefix,
  onNavigate,
}: {
  pathname: string;
  layoutIdPrefix: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${layoutIdPrefix}-active-pill`}
                className="absolute inset-0 rounded-2xl bg-sidebar-accent"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 size-4.5 shrink-0 transition-colors",
                active && "text-primary"
              )}
            />
            <span className="relative z-10 truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Sidebar do desktop. Fica DENTRO do painel arredondado do shell (ver
 * `src/app/layout.tsx`), por isso arredonda o próprio canto esquerdo e ocupa
 * 100% da altura do painel — quem rola é apenas a lista de links.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col gap-7 border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex md:rounded-l-[2rem] 2xl:w-72 2xl:px-5">
      <Logo />
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <NavList pathname={pathname} layoutIdPrefix="desktop" />
      </div>
      <LimiteGastos />
    </aside>
  );
}

/**
 * Trigger + Sheet para telas pequenas. A barra inferior
 * (`src/components/layout/mobile-nav.tsx`) cobre os 5 destinos mais usados;
 * este menu continua existindo pra dar acesso aos 7 links completos.
 */
export function MobileSidebarTrigger() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full md:hidden"
            aria-label="Abrir menu de navegação"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(84vw,18rem)] flex-col border-r border-sidebar-border bg-sidebar px-4 pt-6 pb-6"
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <Logo />
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
          <NavList
            pathname={pathname}
            layoutIdPrefix="mobile"
            onNavigate={() => setOpen(false)}
          />
        </div>
        <LimiteGastos className="mt-4" />
      </SheetContent>
    </Sheet>
  );
}
