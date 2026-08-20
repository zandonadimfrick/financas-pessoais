-- CreateTable
CREATE TABLE "SpendingLimit" (
    "id" TEXT NOT NULL,
    "escopo" "Escopo" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendingLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpendingLimit_escopo_key" ON "SpendingLimit"("escopo");
