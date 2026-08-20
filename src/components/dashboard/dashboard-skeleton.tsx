import { Skeleton } from "@/components/ui/skeleton";

/**
 * Espelha exatamente o mosaico de `src/app/page.tsx` (mesmos spans e alturas
 * aproximadas de cada card) para não haver salto de layout quando os dados
 * chegam.
 */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
      {/* Hero de saldo */}
      <Skeleton className="min-h-[15rem] rounded-2xl md:col-span-2 xl:row-span-2" />
      {/* Ações rápidas (só mobile) */}
      <Skeleton className="h-[8.5rem] rounded-2xl md:hidden" />
      {/* Entradas / Saídas */}
      <Skeleton className="h-[7.5rem] rounded-2xl" />
      <Skeleton className="h-[7.5rem] rounded-2xl" />
      {/* Anel de comprometimento */}
      <Skeleton className="h-[9.5rem] rounded-2xl md:col-span-2" />
      {/* Gráfico principal + breakdown por categoria */}
      <Skeleton className="h-[24rem] rounded-2xl md:col-span-2 xl:col-span-3" />
      <Skeleton className="h-[24rem] rounded-2xl md:col-span-2 xl:col-span-1" />
      {/* Mapa de gastos */}
      <Skeleton className="h-[18rem] rounded-2xl md:col-span-2 xl:col-span-4" />
      {/* Maiores gastos / contas / últimas transações */}
      <Skeleton className="h-[24rem] rounded-2xl" />
      <Skeleton className="h-[24rem] rounded-2xl" />
      <Skeleton className="h-[24rem] rounded-2xl md:col-span-2" />
    </div>
  );
}
