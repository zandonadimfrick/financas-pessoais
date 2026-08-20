import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function DashboardError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle className="size-8 text-expense" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
