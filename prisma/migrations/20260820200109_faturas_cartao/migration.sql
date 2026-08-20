-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('ABERTA', 'FECHADA', 'PAGA');

-- CreateTable
CREATE TABLE "CardInvoice" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "fechamento" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'ABERTA',
    "pagoEm" TIMESTAMP(3),
    "valorPago" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardInvoice_cardId_idx" ON "CardInvoice"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardInvoice_cardId_competencia_key" ON "CardInvoice"("cardId", "competencia");

-- AddForeignKey
ALTER TABLE "CardInvoice" ADD CONSTRAINT "CardInvoice_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
