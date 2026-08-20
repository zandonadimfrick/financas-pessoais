import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  subWeeks,
  parseISO,
  format,
  eachDayOfInterval,
  isValid,
} from "date-fns";

type RangeType = "day" | "week" | "month";
type ScopeType = "PF" | "PJ" | "ALL";

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

function computeWindow(range: RangeType, anchor: Date) {
  if (range === "month") {
    return { windowStart: startOfMonth(anchor), windowEnd: endOfMonth(anchor) };
  }
  if (range === "week") {
    return {
      windowStart: startOfWeek(anchor, { weekStartsOn: 1 }),
      windowEnd: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }
  return { windowStart: startOfDay(anchor), windowEnd: endOfDay(anchor) };
}

function computePreviousWindow(range: RangeType, anchor: Date) {
  if (range === "month") {
    const prevAnchor = subMonths(anchor, 1);
    return { windowStart: startOfMonth(prevAnchor), windowEnd: endOfMonth(prevAnchor) };
  }
  if (range === "week") {
    const prevAnchor = subWeeks(anchor, 1);
    return {
      windowStart: startOfWeek(prevAnchor, { weekStartsOn: 1 }),
      windowEnd: endOfWeek(prevAnchor, { weekStartsOn: 1 }),
    };
  }
  const prevAnchor = subDays(anchor, 1);
  return { windowStart: startOfDay(prevAnchor), windowEnd: endOfDay(prevAnchor) };
}

type Totals = { entradas: number; saidas: number; saldo: number };

function sumTotals(
  transactions: { tipo: string; valor: number; data: Date }[],
  start: Date,
  end: Date
): Totals {
  let entradas = 0;
  let saidas = 0;
  for (const t of transactions) {
    if (t.data < start || t.data > end) continue;
    if (t.tipo === "ENTRADA") entradas += t.valor;
    else saidas += t.valor;
  }
  return { entradas: round2(entradas), saidas: round2(saidas), saldo: round2(entradas - saidas) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const rangeParam = searchParams.get("range") ?? "month";
    if (!["day", "week", "month"].includes(rangeParam)) {
      return NextResponse.json({ error: "Parâmetro 'range' inválido" }, { status: 400 });
    }
    const range = rangeParam as RangeType;

    const scopeParam = searchParams.get("scope") ?? "ALL";
    if (!["PF", "PJ", "ALL"].includes(scopeParam)) {
      return NextResponse.json({ error: "Parâmetro 'scope' inválido" }, { status: 400 });
    }
    const scope = scopeParam as ScopeType;

    const dateParam = searchParams.get("date");
    const anchorDate = dateParam ? parseISO(dateParam) : new Date();
    if (!isValid(anchorDate)) {
      return NextResponse.json({ error: "Parâmetro 'date' inválido" }, { status: 400 });
    }

    const { windowStart, windowEnd } = computeWindow(range, anchorDate);
    const { windowStart: prevStart, windowEnd: prevEnd } = computePreviousWindow(range, anchorDate);

    const seriesStart = range === "day" ? startOfDay(subDays(anchorDate, 13)) : windowStart;
    const seriesEnd = range === "day" ? endOfDay(anchorDate) : windowEnd;

    const scopeWhere: Prisma.TransactionWhereInput = scope === "ALL" ? {} : { escopo: scope };

    const [seriesTransactions, prevTransactions, accounts] = await Promise.all([
      prisma.transaction.findMany({
        where: { ...scopeWhere, efetivado: true, data: { gte: seriesStart, lte: seriesEnd } },
        select: { tipo: true, valor: true, data: true, categoryId: true, category: true },
      }),
      prisma.transaction.findMany({
        where: { ...scopeWhere, efetivado: true, data: { gte: prevStart, lte: prevEnd } },
        select: { tipo: true, valor: true, data: true },
      }),
      prisma.account.findMany({
        where: { arquivada: false, ...(scope === "ALL" ? {} : { escopo: scope }) },
        select: { id: true, nome: true, cor: true, saldoInicial: true },
      }),
    ]);

    const totals = sumTotals(seriesTransactions, windowStart, windowEnd);
    const previousTotals = sumTotals(prevTransactions, prevStart, prevEnd);

    const deltaPct = {
      entradas: previousTotals.entradas === 0 ? null : round1(((totals.entradas - previousTotals.entradas) / previousTotals.entradas) * 100),
      saidas: previousTotals.saidas === 0 ? null : round1(((totals.saidas - previousTotals.saidas) / previousTotals.saidas) * 100),
      saldo: previousTotals.saldo === 0 ? null : round1(((totals.saldo - previousTotals.saldo) / previousTotals.saldo) * 100),
    };

    const seriesDays = eachDayOfInterval({ start: seriesStart, end: seriesEnd });
    const seriesMap = new Map<string, { entradas: number; saidas: number }>();
    for (const day of seriesDays) seriesMap.set(dateKey(day), { entradas: 0, saidas: 0 });
    for (const t of seriesTransactions) {
      const key = dateKey(t.data);
      const bucket = seriesMap.get(key);
      if (!bucket) continue;
      if (t.tipo === "ENTRADA") bucket.entradas += t.valor;
      else bucket.saidas += t.valor;
    }
    const series = seriesDays.map((day) => {
      const key = dateKey(day);
      const bucket = seriesMap.get(key)!;
      return { date: key, entradas: round2(bucket.entradas), saidas: round2(bucket.saidas) };
    });

    let peakSpendDay: { date: string; valor: number } | null = null;
    for (const item of series) {
      if (item.saidas > 0 && (peakSpendDay === null || item.saidas > peakSpendDay.valor)) {
        peakSpendDay = { date: item.date, valor: item.saidas };
      }
    }

    const saidasNoPeriodo = seriesTransactions.filter(
      (t) => t.tipo === "SAIDA" && t.data >= windowStart && t.data <= windowEnd
    );
    const totalSaidas = saidasNoPeriodo.reduce((acc, t) => acc + t.valor, 0);
    const porCategoriaMap = new Map<string, { categoryId: string | null; nome: string; cor: string; valor: number }>();
    for (const t of saidasNoPeriodo) {
      const key = t.categoryId ?? "__none__";
      const existing = porCategoriaMap.get(key);
      if (existing) {
        existing.valor += t.valor;
      } else {
        porCategoriaMap.set(key, {
          categoryId: t.categoryId,
          nome: t.category?.nome ?? "Sem categoria",
          cor: t.category?.cor ?? "#94a3b8",
          valor: t.valor,
        });
      }
    }
    const porCategoria = Array.from(porCategoriaMap.values())
      .map((c) => ({
        categoryId: c.categoryId,
        nome: c.nome,
        cor: c.cor,
        valor: round2(c.valor),
        percentual: totalSaidas === 0 ? 0 : round1((c.valor / totalSaidas) * 100),
      }))
      .sort((a, b) => b.valor - a.valor);

    const accountIds = accounts.map((a) => a.id);
    const accountSums = accountIds.length
      ? await prisma.transaction.groupBy({
          by: ["accountId", "tipo"],
          where: { efetivado: true, accountId: { in: accountIds } },
          _sum: { valor: true },
        })
      : [];
    const accountSumMap = new Map<string, { entradas: number; saidas: number }>();
    for (const row of accountSums) {
      if (!row.accountId) continue;
      const bucket = accountSumMap.get(row.accountId) ?? { entradas: 0, saidas: 0 };
      if (row.tipo === "ENTRADA") bucket.entradas += row._sum.valor ?? 0;
      else bucket.saidas += row._sum.valor ?? 0;
      accountSumMap.set(row.accountId, bucket);
    }
    const contasResumo = accounts.map((a) => {
      const bucket = accountSumMap.get(a.id) ?? { entradas: 0, saidas: 0 };
      return {
        id: a.id,
        nome: a.nome,
        cor: a.cor,
        saldoAtual: round2(a.saldoInicial + bucket.entradas - bucket.saidas),
      };
    });

    return NextResponse.json({
      range,
      scope,
      anchorDate: dateKey(anchorDate),
      windowStart: dateKey(windowStart),
      windowEnd: dateKey(windowEnd),
      totals,
      previousTotals,
      deltaPct,
      series,
      peakSpendDay,
      porCategoria,
      contasResumo,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao gerar dashboard" }, { status: 500 });
  }
}
