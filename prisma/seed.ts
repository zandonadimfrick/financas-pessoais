import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categoriasSaida = [
  { nome: "Moradia", essencial: true, cor: "#f97316", icone: "home" },
  { nome: "Contas Fixas", essencial: true, cor: "#eab308", icone: "receipt" },
  { nome: "Mercado", essencial: true, cor: "#84cc16", icone: "shopping-basket" },
  { nome: "Alimentação", essencial: true, cor: "#22c55e", icone: "utensils" },
  { nome: "Transporte", essencial: true, cor: "#06b6d4", icone: "car" },
  { nome: "Saúde", essencial: true, cor: "#0ea5e9", icone: "heart-pulse" },
  { nome: "Educação", essencial: true, cor: "#6366f1", icone: "graduation-cap" },
  { nome: "Assinaturas", essencial: false, cor: "#a855f7", icone: "repeat" },
  { nome: "E-commerce & Varejo", essencial: false, cor: "#d946ef", icone: "shopping-cart" },
  { nome: "Delivery", essencial: false, cor: "#ec4899", icone: "bike" },
  { nome: "Lazer", essencial: false, cor: "#f43f5e", icone: "party-popper" },
  { nome: "Vestuário", essencial: false, cor: "#f59e0b", icone: "shirt" },
  { nome: "Viagens", essencial: false, cor: "#14b8a6", icone: "plane" },
  { nome: "Impostos & Taxas", essencial: true, cor: "#64748b", icone: "landmark" },
  { nome: "Transferência enviada", essencial: false, cor: "#64748b", icone: "arrow-right-left" },
  { nome: "Outros", essencial: false, cor: "#94a3b8", icone: "more-horizontal" },
];

const categoriasEntrada = [
  { nome: "Salário", cor: "#22c55e", icone: "briefcase" },
  { nome: "Receita PJ", cor: "#10b981", icone: "building-2" },
  { nome: "Freelance", cor: "#14b8a6", icone: "laptop" },
  { nome: "Investimentos", cor: "#0ea5e9", icone: "trending-up" },
  { nome: "Reembolso", cor: "#6366f1", icone: "rotate-ccw" },
  { nome: "Transferência recebida", cor: "#64748b", icone: "arrow-right-left" },
  { nome: "Outros", cor: "#94a3b8", icone: "more-horizontal" },
];

const contas = [
  { nome: "Nubank", instituicao: "Nubank", escopo: "PF" as const, cor: "#8a05be" },
  { nome: "Itaú", instituicao: "Itaú", escopo: "PF" as const, cor: "#ec7000" },
  { nome: "XP", instituicao: "XP Investimentos", escopo: "PF" as const, cor: "#000000" },
  { nome: "Inter", instituicao: "Banco Inter", escopo: "PF" as const, cor: "#ff7a00" },
  { nome: "C6 Bank", instituicao: "C6 Bank", escopo: "PF" as const, cor: "#1a1a1a" },
  { nome: "Conta Simples", instituicao: "Conta Simples", escopo: "PJ" as const, cor: "#3b82f6" },
];

async function main() {
  for (const c of categoriasSaida) {
    await prisma.category.upsert({
      where: { nome: c.nome },
      update: {},
      create: { ...c, tipo: "SAIDA" },
    });
  }

  for (const c of categoriasEntrada) {
    await prisma.category.upsert({
      where: { nome: c.nome },
      update: {},
      create: { ...c, tipo: "ENTRADA" },
    });
  }

  for (const conta of contas) {
    const existing = await prisma.account.findFirst({ where: { nome: conta.nome } });
    if (!existing) {
      await prisma.account.create({ data: { ...conta, tipo: "CORRENTE" } });
    }
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
