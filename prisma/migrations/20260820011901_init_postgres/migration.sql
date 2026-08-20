-- CreateEnum
CREATE TYPE "Escopo" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusRecebivel" AS ENUM ('PENDENTE', 'RECEBIDO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('NOTA_FISCAL', 'COMPROVANTE', 'OUTRO');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL DEFAULT 'CORRENTE',
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cor" TEXT NOT NULL DEFAULT '#6366f1',
    "icone" TEXT,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "limite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diaFechamento" INTEGER NOT NULL DEFAULT 1,
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "cor" TEXT NOT NULL DEFAULT '#a855f7',
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "essencial" BOOLEAN NOT NULL DEFAULT false,
    "cor" TEXT NOT NULL DEFAULT '#22d3ee',
    "icone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "observacao" TEXT,
    "efetivado" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "accountId" TEXT,
    "cardId" TEXT,
    "recurringId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurring" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoLancamento" NOT NULL DEFAULT 'SAIDA',
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "diaCobranca" INTEGER NOT NULL DEFAULT 1,
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "proximaCobranca" TIMESTAMP(3),
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusRecebivel" NOT NULL DEFAULT 'PENDENTE',
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "pagador" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'COMPROVANTE',
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "escopo" "Escopo" NOT NULL DEFAULT 'PF',
    "competencia" TEXT NOT NULL,
    "observacao" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nome_key" ON "Category"("nome");

-- CreateIndex
CREATE INDEX "Transaction_data_idx" ON "Transaction"("data");

-- CreateIndex
CREATE INDEX "Transaction_tipo_idx" ON "Transaction"("tipo");

-- CreateIndex
CREATE INDEX "Transaction_escopo_idx" ON "Transaction"("escopo");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "Recurring"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurring" ADD CONSTRAINT "Recurring_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
