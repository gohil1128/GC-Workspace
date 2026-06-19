-- CreateEnum
CREATE TYPE "CapitalStatus" AS ENUM ('IN_SERVICE', 'SOLD', 'WRITTEN_OFF');

-- CreateTable
CREATE TABLE "CapitalAsset" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePriceCents" INTEGER NOT NULL,
    "usefulLifeMonths" INTEGER,
    "salvageValueCents" INTEGER NOT NULL DEFAULT 0,
    "status" "CapitalStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "notes" TEXT,
    "eventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapitalAsset_locationId_idx" ON "CapitalAsset"("locationId");
CREATE INDEX "CapitalAsset_eventId_idx" ON "CapitalAsset"("eventId");

-- AddForeignKey
ALTER TABLE "CapitalAsset" ADD CONSTRAINT "CapitalAsset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapitalAsset" ADD CONSTRAINT "CapitalAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CapitalAsset" ADD CONSTRAINT "CapitalAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
