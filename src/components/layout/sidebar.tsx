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
  Sparkles,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
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

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="bg-gradient-accent flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[0_0_24px_-4px_var(--accent-indigo)]">
        <Sparkles className="size-4.5 text-white" />
      </div>
      <span className="text-gradient-accent font-heading text-lg font-semibold tracking-tight">
        Finanças
      </span>
    </div>
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
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${layoutIdPrefix}-active-pill`}
                className="glass absolute inset-0 rounded-xl border border-primary/25 bg-gradient-to-r from-accent-indigo/15 via-accent-violet/15 to-accent-cyan/15"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 size-4.5 shrink-0" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar fixa à esquerda, visível apenas em telas md+. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex 2xl:w-72 2xl:px-5">
      <Logo />
      <NavList pathname={pathname} layoutIdPrefix="desktop" />
    </aside>
  );
}

/** Trigger + Sheet para navegação em telas pequenas (colapsável). */
export function MobileSidebarTrigger() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menu de navegação"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(80vw,17rem)] border-r border-sidebar-border bg-sidebar px-4 pt-6"
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <Logo />
        <div className="mt-6">
          <NavList
            pathname={pathname}
            layoutIdPrefix="mobile"
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
