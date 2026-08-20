# Finanças — Painel Pessoal

Sistema de finanças pessoais para acompanhar entradas, saídas, contas, cartões,
recebíveis, assinaturas e os documentos fiscais do mês (notas e comprovantes).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Prisma 7** com Postgres no **Supabase** (via driver adapter `pg`)
- **shadcn/ui** (Base UI), **Recharts** e **Framer Motion**

## Rodando localmente

```bash
npm install
npm run dev
```

Crie um `.env` na raiz com:

```env
# Supabase → Connect → ORM → Prisma
DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://…pooler.supabase.com:5432/postgres"

# Senha única de acesso ao painel
APP_PASSWORD="sua-senha"
# Segredo que assina o cookie de sessão: openssl rand -hex 32
AUTH_SECRET="…"
```

## Banco de dados

```bash
npx prisma migrate dev     # aplica as migrations
npx tsx prisma/seed.ts     # bancos e categorias iniciais
```

Para ver as telas com dados realistas antes de lançar de verdade:

```bash
npx tsx prisma/seed-demo.ts            # gera 12 meses de lançamentos fictícios
npx tsx prisma/seed-demo.ts --limpar   # remove todos eles
```

## Acesso

Todas as rotas são protegidas por `src/proxy.ts`: sem sessão, as páginas
redirecionam para `/login` e a API responde `401`. A sessão fica num cookie
`httpOnly` assinado com HMAC-SHA256, válido por 30 dias.

## Funcionalidades

- **Painel** em mosaico: saldo, entradas e saídas do período, comprometimento
  da renda, gráfico diário, mapa de gastos (dia/mês/ano) e maiores categorias
- **Transações** com filtro por período, busca geral e **lançamento por frase**
  — escreva "gastei 25 na padaria hoje no cartão Nubank" e o formulário abre
  preenchido para conferência
- **Transferência entre contas**, que gera os dois lançamentos vinculados sem
  contar como ganho ou gasto nos relatórios
- **Documentos**: upload de notas fiscais e comprovantes por competência
- Tema claro e escuro, e layout pensado tanto para 1920×1080 quanto para o
  celular (com navegação inferior)
