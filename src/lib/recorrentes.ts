import { prisma } from "@/lib/prisma";
import type { Periodicidade } from "@/generated/prisma/client";

/**
 * Geração das cobranças de assinaturas e demais recorrentes.
 *
 * Não há agendador rodando: as cobranças vencidas são criadas sob demanda,
 * quando o app é aberto. O efeito prático é o mesmo — ao olhar as contas, o
 * que já venceu está lançado — e evita depender de infraestrutura extra.
 *
 * A operação é idempotente: antes de lançar, verifica se já existe transação
 * daquele recorrente na data. Abrir o app dez vezes no mesmo dia não duplica
 * nada.
 */

/** Ajusta o dia ao mês (dia 31 em fevereiro vira o último dia). */
function comDiaValido(ano: number, mes: number, dia: number): Date {
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia), 12));
}

/** Datas de cobrança de um recorrente entre `desde` e `ate`, inclusive. */
function datasDeCobranca(
  periodicidade: Periodicidade,
  diaCobranca: number,
  desde: Date,
  ate: Date
): Date[] {
  const datas: Date[] = [];

  if (periodicidade === "MENSAL" || periodicidade === "ANUAL") {
    const passo = periodicidade === "ANUAL" ? 12 : 1;
    let ano = desde.getUTCFullYear();
    let mes = desde.getUTCMonth();

    for (let i = 0; i < 240; i++) {
      const data = comDiaValido(ano, mes, diaCobranca);
      if (data.getTime() > ate.getTime()) break;
      if (data.getTime() >= desde.getTime()) datas.push(data);
      mes += passo;
      if (mes > 11) {
        ano += Math.floor(mes / 12);
        mes = mes % 12;
      }
    }
    return datas;
  }

  // Diária e semanal: avança a partir da primeira data válida.
  const intervalo = periodicidade === "SEMANAL" ? 7 : 1;
  const cursor = new Date(desde);
  for (let i = 0; i < 400 && cursor.getTime() <= ate.getTime(); i++) {
    datas.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + intervalo);
  }
  return datas;
}

export interface ResultadoGeracao {
  criadas: number;
  detalhes: { nome: string; data: string; valor: number }[];
}

/**
 * Lança as cobranças vencidas de todos os recorrentes ativos.
 *
 * `desdeCriacao` limita o alcance: um recorrente criado hoje não gera
 * histórico retroativo de meses que o usuário nunca registrou.
 */
export async function gerarCobrancasPendentes(
  hoje = new Date()
): Promise<ResultadoGeracao> {
  const limite = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 23, 59, 59)
  );

  const recorrentes = await prisma.recurring.findMany({
    where: { ativo: true },
    include: { transactions: { select: { data: true } } },
  });

  const detalhes: ResultadoGeracao["detalhes"] = [];
  const novas: {
    descricao: string;
    valor: number;
    tipo: "ENTRADA" | "SAIDA";
    data: Date;
    escopo: "PF" | "PJ";
    efetivado: boolean;
    categoryId: string | null;
    accountId: string | null;
    cardId: string | null;
    recurringId: string;
  }[] = [];

  for (const recorrente of recorrentes) {
    const inicio = new Date(
      Date.UTC(
        recorrente.createdAt.getUTCFullYear(),
        recorrente.createdAt.getUTCMonth(),
        recorrente.createdAt.getUTCDate()
      )
    );

    // Dias já lançados, para não duplicar.
    const jaLancadas = new Set(
      recorrente.transactions.map((t) => t.data.toISOString().slice(0, 10))
    );

    for (const data of datasDeCobranca(
      recorrente.periodicidade,
      recorrente.diaCobranca,
      inicio,
      limite
    )) {
      const chave = data.toISOString().slice(0, 10);
      if (jaLancadas.has(chave)) continue;

      novas.push({
        descricao: recorrente.nome,
        valor: recorrente.valor,
        tipo: recorrente.tipo,
        data,
        escopo: recorrente.escopo,
        efetivado: true,
        categoryId: recorrente.categoryId,
        accountId: recorrente.accountId,
        cardId: recorrente.cardId,
        recurringId: recorrente.id,
      });
      jaLancadas.add(chave);
      detalhes.push({ nome: recorrente.nome, data: chave, valor: recorrente.valor });
    }
  }

  if (novas.length > 0) {
    await prisma.transaction.createMany({ data: novas });
  }

  return { criadas: novas.length, detalhes };
}

/** Equivalente mensal de um recorrente, para somar periodicidades diferentes. */
export function valorMensalEquivalente(
  valor: number,
  periodicidade: Periodicidade
): number {
  switch (periodicidade) {
    case "DIARIA":
      return valor * 30;
    case "SEMANAL":
      return valor * 4.33;
    case "ANUAL":
      return valor / 12;
    default:
      return valor;
  }
}
