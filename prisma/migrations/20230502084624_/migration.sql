-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_saleInvoiceId_fkey";

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_related_id_fkey" FOREIGN KEY ("related_id") REFERENCES "saleInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
