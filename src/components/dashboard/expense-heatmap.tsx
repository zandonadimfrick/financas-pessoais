"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExpenseHeatmap } from "@/hooks/use-expense-heatmap";
import type { HeatmapBucket, HeatmapGranularity } from "@/components/dashboard/types";

const GRANULARITY_TABS: { value: HeatmapGranularity; label: string }[] = [
  { value: "day", label: "Dias" },
  { value: "month", label: "Meses" },
  { value: "year", label: "Anos" },
];

/**
 * Escala de 5 níveis (0 a 4) verde "dinheiro" — quanto mais escuro/vívido,
 * MAIS gasto teve. No tema escuro o fundo já é bem escuro, então a
 * progressão vai de "quase invisível" pra "bem brilhante" (senão o nível
 * mais alto sumiria contra o fundo); no tema claro a progressão é a
 * literal claro → escuro.
 */
const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-[#eef5f1] dark:bg-white/5",
  1: "bg-[#c8e6d3] dark:bg-[#0f3d29]",
  2: "bg-[#8fd1ab] dark:bg-[#15803d]",
  3: "bg-[#3fae74] dark:bg-[#22c55e]",
  4: "bg-[#0d5c39] dark:bg-[#4ade80]",
};

const LEVEL_TEXT_CLASSES: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-foreground/80",
  2: "text-foreground/90 dark:text-white",
  3: "text-white dark:text-background",
  4: "text-white dark:text-background",
};

function bucketAriaLabel(bucket: HeatmapBucket) {
  return `${bucket.label}: ${formatCurrency(bucket.valor)} em despesas`;
}

/**
 * Organiza os 365/366 buckets diários num grid estilo "GitHub
 * contributions": colunas = semanas, linhas = dias da semana (dom..sáb).
 * Preenche com células nulas antes do 1º de janeiro até o dia da semana
 * correto, pra alinhar as colunas.
 */
function buildDayWeeks(buckets: HeatmapBucket[]): (HeatmapBucket | null)[][] {
  if (buckets.length === 0) return [];
  const firstDate = new Date(`${buckets[0].key}T00:00:00`);
  const startWeekday = firstDate.getDay();
  const cells: (HeatmapBucket | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...buckets,
  ];
  const weeks: (HeatmapBucket | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function DaySquare({ bucket }: { bucket: HeatmapBucket }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={bucketAriaLabel(bucket)}
        className={cn(
          "size-[11px] rounded-sm ring-1 ring-black/5 transition-transform duration-150 hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-[13px] dark:ring-white/5",
          LEVEL_CLASSES[bucket.level]
        )}
      />
      <TooltipContent>
        {bucket.label} · {formatCurrency(bucket.valor)}
      </TooltipContent>
    </Tooltip>
  );
}

function BlockSquare({
  bucket,
  sizeClass,
  textClass,
}: {
  bucket: HeatmapBucket;
  sizeClass: string;
  textClass: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={bucketAriaLabel(bucket)}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ring-1 ring-black/5 transition-transform duration-150 hover:scale-[1.04] focus-visible:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:ring-white/5",
          sizeClass,
          LEVEL_CLASSES[bucket.level],
          textClass
        )}
      >
        {bucket.label}
      </TooltipTrigger>
      <TooltipContent>
        {bucket.label} · {formatCurrency(bucket.valor)}
      </TooltipContent>
    </Tooltip>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Menos</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              "size-3 rounded-sm ring-1 ring-black/5 dark:ring-white/5",
              LEVEL_CLASSES[level]
            )}
          />
        ))}
      </div>
      <span>Mais</span>
    </div>
  );
}

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.02 } },
};
const cellVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

export function ExpenseHeatmap() {
  const currentYear = new Date().getFullYear();
  const [granularity, setGranularity] = useState<HeatmapGranularity>("day");
  const [year, setYear] = useState(currentYear);

  const { data, isFetching, error } = useExpenseHeatmap(granularity, year);

  const availableYears = data?.availableYears ?? [currentYear];
  const dayWeeks = useMemo(
    () => (data && granularity === "day" ? buildDayWeeks(data.buckets) : []),
    [data, granularity]
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="size-4 text-muted-foreground" />
          Mapa de gastos
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          {granularity !== "year" && (
            <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
              <SelectTrigger className="h-8 w-[92px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Tabs
            value={granularity}
            onValueChange={(value) => setGranularity(value as HeatmapGranularity)}
          >
            <TabsList>
              {GRANULARITY_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {error && !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : !data ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <motion.div
            key={`${granularity}-${year}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isFetching ? 0.6 : 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {granularity === "day" && (
              <div className="overflow-x-auto pb-2">
                <div className="mx-auto flex w-fit gap-[3px]">
                  {dayWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((bucket, dayIndex) =>
                        bucket ? (
                          <DaySquare key={bucket.key} bucket={bucket} />
                        ) : (
                          <div
                            key={`empty-${weekIndex}-${dayIndex}`}
                            aria-hidden
                            className="size-[11px] sm:size-[13px]"
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {granularity === "month" && (
              <motion.div
                className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12"
                variants={gridVariants}
                initial="hidden"
                animate="visible"
              >
                {data.buckets.map((bucket) => (
                  <motion.div key={bucket.key} variants={cellVariants}>
                    <BlockSquare
                      bucket={bucket}
                      sizeClass="aspect-square w-full"
                      textClass={LEVEL_TEXT_CLASSES[bucket.level]}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {granularity === "year" && (
              <motion.div
                className="flex flex-wrap gap-3"
                variants={gridVariants}
                initial="hidden"
                animate="visible"
              >
                {data.buckets.map((bucket) => (
                  <motion.div key={bucket.key} variants={cellVariants}>
                    <BlockSquare
                      bucket={bucket}
                      sizeClass="size-20 text-sm"
                      textClass={LEVEL_TEXT_CLASSES[bucket.level]}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        <div className="flex items-center justify-end border-t border-border/50 pt-3">
          <HeatmapLegend />
        </div>
      </CardContent>
    </Card>
  );
}
