/**
 * Popula o banco com transações FICTÍCIAS para visualizar o dashboard,
 * o gráfico e o mapa de gastos com dados realistas.
 *
 * Todas as transações criadas aqui levam o marcador `DEMO_TAG` no campo
 * `observacao`, então dá pra remover todas de uma vez:
 *
 *   npx tsx prisma/seed-demo.ts --limpar
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_TAG = "[dados-ficticios]";

/** RNG com semente fixa: rodar de novo gera o mesmo cenário. */
function makeRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const rng = makeRng(20260820);

function pick<T>(items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function valorEntre(min: number, max: number) {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

/** Gastos do dia a dia: descrição + faixa de valor + categoria. */
const GASTOS_FREQUENTES = [
  { descricao: "Supermercado Extra", categoria: "Mercado", min: 80, max: 420 },
  { descricao: "Hortifruti", categoria: "Mercado", min: 25, max: 120 },
  { descricao: "iFood", categoria: "Delivery", min: 28, max: 95 },
  { descricao: "Padaria", categoria: "Alimentação", min: 12, max: 45 },
  { descricao: "Restaurante", categoria: "Alimentação", min: 45, max: 180 },
  { descricao: "Uber", categoria: "Transporte", min: 14, max: 68 },
  { descricao: "Posto Ipiranga", categoria: "Transporte", min: 120, max: 280 },
  { descricao: "Farmácia", categoria: "Saúde", min: 25, max: 180 },
  { descricao: "Amazon", categoria: "E-commerce & Varejo", min: 40, max: 350 },
  { descricao: "Mercado Livre", categoria: "E-commerce & Varejo", min: 35, max: 420 },
  { descricao: "Cinema", categoria: "Lazer", min: 40, max: 120 },
  { descricao: "Bar com amigos", categoria: "Lazer", min: 60, max: 240 },
  { descricao: "Renner", categoria: "Vestuário", min: 90, max: 380 },
];

/** Contas fixas: mesmo dia todo mês, valor com pequena variação. */
const GASTOS_FIXOS = [
  { descricao: "Aluguel", categoria: "Moradia", dia: 5, min: 1850, max: 1850 },
  { descricao: "Condomínio", categoria: "Moradia", dia: 5, min: 480, max: 520 },
  { descricao: "Energia elétrica", categoria: "Contas Fixas", dia: 12, min: 145, max: 320 },
  { descricao: "Internet fibra", categoria: "Contas Fixas", dia: 15, min: 129, max: 129 },
  { descricao: "Plano de saúde", categoria: "Saúde", dia: 8, min: 420, max: 420 },
  { descricao: "Netflix", categoria: "Assinaturas", dia: 20, min: 44.9, max: 44.9 },
  { descricao: "Spotify", categoria: "Assinaturas", dia: 22, min: 21.9, max: 21.9 },
  { descricao: "ChatGPT Plus", categoria: "Assinaturas", dia: 18, min: 110, max: 125 },
  { descricao: "Academia", categoria: "Saúde", dia: 10, min: 129, max: 129 },
];

const ENTRADAS = [
  { descricao: "Salário", categoria: "Salário", dia: 5, min: 8500, max: 8500, escopo: "PF" as const },
  { descricao: "Nota fiscal — consultoria", categoria: "Receita PJ", dia: 15, min: 3200, max: 6800, escopo: "PJ" as const },
];

async function limpar() {
  const { count } = await prisma.transaction.deleteMany({
    where: { observacao: { contains: DEMO_TAG } },
  });
  console.log(`${count} transação(ões) fictícia(s) removida(s).`);
}

async function popular() {
  const categorias = await prisma.category.findMany();
  const contas = await prisma.account.findMany({ where: { arquivada: false } });
  const cartoes = await prisma.card.findMany({ where: { arquivado: false } });

  const categoriaPorNome = new Map(categorias.map((c) => [c.nome, c]));
  const contasPF = contas.filter((c) => c.escopo === "PF");
  const contasPJ = contas.filter((c) => c.escopo === "PJ");
  const cartoesPF = cartoes.filter((c) => c.escopo === "PF");

  if (contasPF.length === 0) {
    console.error("Nenhuma conta PF encontrada. Rode `npx tsx prisma/seed.ts` primeiro.");
    process.exit(1);
  }

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  type NovaTransacao = {
    descricao: string;
    valor: number;
    tipo: "ENTRADA" | "SAIDA";
    data: Date;
    escopo: "PF" | "PJ";
    observacao: string;
    efetivado: boolean;
    categoryId: string | null;
    accountId: string | null;
    cardId: string | null;
  };

  const transacoes: NovaTransacao[] = [];

  const categoriaId = (nome: string) => categoriaPorNome.get(nome)?.id ?? null;

  // 12 meses para trás a partir do mês atual, para o mapa de gastos ter história.
  for (let offset = 11; offset >= 0; offset--) {
    const ref = new Date(anoAtual, mesAtual - offset, 1);
    const ano = ref.getFullYear();
    const mes = ref.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const ehMesCorrente = offset === 0;
    // No mês corrente só lança até hoje — nada de gasto no futuro.
    const ultimoDia = ehMesCorrente ? hoje.getDate() : diasNoMes;

    for (const entrada of ENTRADAS) {
      if (entrada.dia > ultimoDia) continue;
      const conta = entrada.escopo === "PJ" ? contasPJ[0] : pick(contasPF);
      if (!conta) continue;
      transacoes.push({
        descricao: entrada.descricao,
        valor: valorEntre(entrada.min, entrada.max),
        tipo: "ENTRADA",
        data: new Date(ano, mes, entrada.dia, 12),
        escopo: entrada.escopo,
        observacao: DEMO_TAG,
        efetivado: true,
        categoryId: categoriaId(entrada.categoria),
        accountId: conta.id,
        cardId: null,
      });
    }

    for (const fixo of GASTOS_FIXOS) {
      if (fixo.dia > ultimoDia) continue;
      transacoes.push({
        descricao: fixo.descricao,
        valor: valorEntre(fixo.min, fixo.max),
        tipo: "SAIDA",
        data: new Date(ano, mes, fixo.dia, 12),
        escopo: "PF",
        observacao: DEMO_TAG,
        efetivado: true,
        categoryId: categoriaId(fixo.categoria),
        accountId: pick(contasPF).id,
        cardId: null,
      });
    }

    // Gastos variáveis: alguns dias do mês ficam sem nada e outros concentram
    // vários lançamentos, para o mapa de gastos ter contraste de verdade.
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const diaSemana = new Date(ano, mes, dia).getDay();
      const fimDeSemana = diaSemana === 0 || diaSemana === 6;

      const sorteio = rng();
      let quantidade = 0;
      if (sorteio > 0.78) quantidade = 3;
      else if (sorteio > 0.5) quantidade = 2;
      else if (sorteio > 0.22) quantidade = 1;
      if (fimDeSemana && rng() > 0.45) quantidade += 1;

      for (let i = 0; i < quantidade; i++) {
        const gasto = pick(GASTOS_FREQUENTES);
        const noCartao = cartoesPF.length > 0 && rng() > 0.4;
        transacoes.push({
          descricao: gasto.descricao,
          valor: valorEntre(gasto.min, gasto.max),
          tipo: "SAIDA",
          data: new Date(ano, mes, dia, 12),
          escopo: "PF",
          observacao: DEMO_TAG,
          efetivado: true,
          categoryId: categoriaId(gasto.categoria),
          accountId: noCartao ? null : pick(contasPF).id,
          cardId: noCartao ? pick(cartoesPF).id : null,
        });
      }
    }
  }

  await prisma.transaction.createMany({ data: transacoes });

  const entradas = transacoes
    .filter((t) => t.tipo === "ENTRADA")
    .reduce((s, t) => s + t.valor, 0);
  const saidas = transacoes
    .filter((t) => t.tipo === "SAIDA")
    .reduce((s, t) => s + t.valor, 0);

  console.log(`${transacoes.length} transações fictícias criadas.`);
  console.log(`Entradas: R$ ${entradas.toFixed(2)} · Saídas: R$ ${saidas.toFixed(2)}`);
  console.log(`Para remover: npx tsx prisma/seed-demo.ts --limpar`);
}

async function main() {
  if (process.argv.includes("--limpar")) {
    await limpar();
    return;
  }
  // Evita duplicar caso o script rode duas vezes.
  await limpar();
  await popular();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
