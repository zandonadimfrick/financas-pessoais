import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_FATURA_LABEL } from "@/components/cartoes/fatura-utils";
import type { StatusFatura } from "@/lib/types";

/**
 * Selo de status da fatura. "Atrasada" vence os demais: é a informação que
 * o usuário precisa ver primeiro.
 */
export function StatusFaturaBadge({
  status,
  atrasada = false,
  className,
}: {
  status: StatusFatura;
  atrasada?: boolean;
  className?: string;
}) {
  if (atrasada) {
    return (
      <Badge variant="destructive" className={cn("font-semibold", className)}>
        Atrasada
      </Badge>
    );
  }

  if (status === "PAGA") {
    return (
      <Badge
        variant="secondary"
        className={cn("bg-income/12 text-income", className)}
      >
        Paga
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      {STATUS_FATURA_LABEL[status]}
    </Badge>
  );
}
