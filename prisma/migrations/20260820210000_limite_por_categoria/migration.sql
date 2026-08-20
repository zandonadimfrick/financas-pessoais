-- Limite de gastos passa a ser por CATEGORIA em vez de por escopo.
-- A tabela estava vazia quando esta migração foi criada, por isso a coluna
-- nova pode entrar como NOT NULL sem valor padrão.

DROP INDEX IF EXISTS "SpendingLimit_escopo_key";

ALTER TABLE "SpendingLimit" DROP COLUMN IF EXISTS "escopo";

ALTER TABLE "SpendingLimit" ADD COLUMN "categoryId" TEXT NOT NULL;

CREATE UNIQUE INDEX "SpendingLimit_categoryId_key" ON "SpendingLimit"("categoryId");

ALTER TABLE "SpendingLimit"
  ADD CONSTRAINT "SpendingLimit_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
