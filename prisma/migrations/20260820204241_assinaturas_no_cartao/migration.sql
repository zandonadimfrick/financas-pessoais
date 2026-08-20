-- AlterTable
ALTER TABLE "Recurring" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cardId" TEXT;

-- AddForeignKey
ALTER TABLE "Recurring" ADD CONSTRAINT "Recurring_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurring" ADD CONSTRAINT "Recurring_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
