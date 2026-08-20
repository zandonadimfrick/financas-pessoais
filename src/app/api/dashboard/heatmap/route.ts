import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface Bucket {
  key: string;
  label: string;
  valor: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const querySchema = z.object({
  granularity: z.enum(["day", "month", "year"]),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  scope: z.enum(["PF", "PJ", "ALL"]).default("ALL"),
});

/**
 * Calcula o nível (0-4) de cada bucket a partir do seu valor, relativo ao
 * menor valor positivo e ao maior valor entre todos os buckets. Buckets
 * com valor <= 0 sempre recebem nível 0.
 */
function computeLevels(buckets: Bucket[]): number[] {
  const positivos = buckets.map((b) => b.valor).filter((v) => v > 0);
  if (positivos.length === 0) {
    return buckets.map(() => 0);
  }
  const minPositivo = Math.min(...positivos);
  const max = Math.max(...positivos);
  return buckets.map((b) => {
    if (b.valor <= 0) return 0;
    if (max === minPositivo) return 4;
    const level = 1 + Math.floor(((b.valor - minPositivo) / (max - minPositivo)) * 3.999);
    return Math.min(4, Math.max(1, level));
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      granularity: searchParams.get("granularity") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const { granularity, scope } = parsed.data;
    const currentYear = getYear(new Date());
    const year = parsed.data.year ?? currentYear;

    const scopeWhere: Prisma.TransactionWhereInput = scope === "ALL" ? {} : { escopo: scope };

    // availableYears: todo ano civil com pelo menos uma transação (qualquer
    // tipo/escopo) no banco — usado só pro seletor de ano, independe do
    // filtro de escopo atual.
    const allDates = await prisma.transaction.findMany({ select: { data: true } });
    const yearsWithData = new Set<number>();
    for (const t of allDates) yearsWithData.add(getYear(t.data));
    const availableYears =
      yearsWithData.size > 0 ? Array.from(yearsWithData).sort((a, b) => a - b) : [currentYear];

    let buckets: Bucket[] = [];
    let responseYear: number | null = year;

    if (granularity === "day") {
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(yearStart);
      const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

      const txs = await prisma.transaction.findMany({
        where: {
          ...scopeWhere,
          tipo: "SAIDA",
          efetivado: true,
          data: { gte: yearStart, lte: yearEnd },
        },
        select: { valor: true, data: true },
      });

      const sums = new Map<string, number>();
      for (const t of txs) {
        const key = format(t.data, "yyyy-MM-dd");
        sums.set(key, (sums.get(key) ?? 0) + t.valor);
      }

      buckets = days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return {
          key,
          label: format(d, "d MMM", { locale: ptBR }),
          valor: round2(sums.get(key) ?? 0),
        };
      });
      responseYear = year;
    } else if (granularity === "month") {
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(yearStart);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const txs = await prisma.transaction.findMany({
        where: {
          ...scopeWhere,
          tipo: "SAIDA",
          efetivado: true,
          data: { gte: yearStart, lte: yearEnd },
        },
        select: { valor: true, data: true },
      });

      const sums = new Map<string, number>();
      for (const t of txs) {
        const key = format(t.data, "yyyy-MM");
        sums.set(key, (sums.get(key) ?? 0) + t.valor);
      }

      buckets = months.map((m) => {
        const key = format(m, "yyyy-MM");
        return {
          key,
          label: capitalize(format(m, "MMM", { locale: ptBR })),
          valor: round2(sums.get(key) ?? 0),
        };
      });
      responseYear = year;
    } else {
      // granularity === "year"
      responseYear = null;
      const years = availableYears;

      const txs = await prisma.transaction.findMany({
        where: { ...scopeWhere, tipo: "SAIDA", efetivado: true },
        select: { valor: true, data: true },
      });

      const sums = new Map<number, number>();
      for (const y of years) sums.set(y, 0);
      for (const t of txs) {
        const y = getYear(t.data);
        if (sums.has(y)) sums.set(y, (sums.get(y) ?? 0) + t.valor);
      }

      buckets = years.map((y) => ({
        key: String(y),
        label: String(y),
        valor: round2(sums.get(y) ?? 0),
      }));
    }

    const levels = computeLevels(buckets);
    const bucketsWithLevel = buckets.map((b, i) => ({ ...b, level: levels[i] }));

    const valores = buckets.map((b) => b.valor);
    const min = valores.length > 0 ? round2(Math.min(...valores)) : 0;
    const max = valores.length > 0 ? round2(Math.max(...valores)) : 0;

    return NextResponse.json({
      granularity,
      year: responseYear,
      scope,
      min,
      max,
      availableYears,
      buckets: bucketsWithLevel,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao gerar heatmap" }, { status: 500 });
  }
}
