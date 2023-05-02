-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "saleInvoiceId" INTEGER;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_saleInvoiceId_fkey" FOREIGN KEY ("saleInvoiceId") REFERENCES "saleInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
