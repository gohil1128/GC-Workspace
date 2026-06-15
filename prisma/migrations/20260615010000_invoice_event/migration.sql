-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "eventId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_eventId_idx" ON "Invoice"("eventId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
