"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [saindo, setSaindo] = React.useState(false);

  const sair = async () => {
    if (saindo) return;
    setSaindo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      aria-label="Sair da conta"
      title="Sair"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:size-10"
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  );
}
