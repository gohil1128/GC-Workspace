-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "recipesPinHash" TEXT;

-- AlterTable
ALTER TABLE "CashClose" ADD COLUMN     "cashCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creditCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "specialEvents" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "weather" TEXT;

-- AlterTable
ALTER TABLE "DailySales" ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "bagCode" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "sequence" INTEGER;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "color" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_businessId_startDate_idx" ON "Event"("businessId", "startDate");

-- CreateIndex
CREATE INDEX "CashClose_eventId_idx" ON "CashClose"("eventId");

-- CreateIndex
CREATE INDEX "DailySales_eventId_idx" ON "DailySales"("eventId");

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
