"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-expense/12">
          <AlertTriangle className="size-5 text-expense" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-medium">Não foi possível carregar o painel</p>
          <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="mt-1"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="size-4" aria-hidden />
          Tentar de novo
        </Button>
      </CardContent>
    </Card>
  );
}
