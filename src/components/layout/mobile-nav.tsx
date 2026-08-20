"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Os 5 destinos mais usados. Os outros dois (`/recebiveis`, `/recorrentes`)
 * continuam acessíveis no mobile pelo menu hambúrguer da Topbar
 * (`MobileSidebarTrigger`) — nenhuma rota fica inalcançável.
 */
const mobileNavItems = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/documentos", label: "Docs", icon: FileText },
] as const;

function isItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Barra de navegação inferior fixa (somente telas < md), no estilo do app da
 * referência: ícone + label pequeno, item ativo em coral.
 *
 * O `padding-bottom` soma a safe area do iPhone; a altura total é reservada
 * pelo `main` do shell via `pb-24 md:pb-*` (ver `src/app/layout.tsx`).
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação rápida"
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around px-1 py-1">
        {mobileNavItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/*
                  O sinal de "ativo" é o ícone coral + o realce da pílula. O
                  label fica em `--foreground` porque coral sobre branco não
                  chega a 4.5:1 e este texto é bem pequeno.
                */}
                <Icon
                  className={cn("size-5 shrink-0", active && "text-primary")}
                />
                <span
                  className={cn(
                    "w-full truncate text-center text-[0.65rem] leading-none",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
