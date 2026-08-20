-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "compraId" TEXT,
ADD COLUMN     "parcela" INTEGER,
ADD COLUMN     "parcelasTotal" INTEGER,
ADD COLUMN     "valorTotal" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Transaction_compraId_idx" ON "Transaction"("compraId");
