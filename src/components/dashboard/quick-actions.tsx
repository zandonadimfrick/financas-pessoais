"use client";

import Link from "next/link";
import { CreditCard, FileText, Plus, Wallet2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIONS = [
  { href: "/transacoes", label: "Lançar", icon: Plus },
  { href: "/contas", label: "Contas", icon: Wallet2 },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/documentos", label: "Docs", icon: FileText },
] as const;

/**
 * Linha de atalhos da referência mobile: 4 ícones quadrados arredondados com
 * rótulo embaixo. Só no mobile — no desktop a sidebar já cumpre esse papel.
 */
export function QuickActions({ className }: { className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Ações rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-4 gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="group flex flex-col items-center gap-1.5 rounded-xl py-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className="grid size-12 place-items-center rounded-2xl bg-secondary text-foreground transition-colors group-hover:bg-accent"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
