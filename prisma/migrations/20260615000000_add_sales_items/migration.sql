-- CreateTable
CREATE TABLE "SalesItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "netSalesCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesItem_locationId_businessDate_itemName_key" ON "SalesItem"("locationId", "businessDate", "itemName");

-- CreateIndex
CREATE INDEX "SalesItem_locationId_businessDate_idx" ON "SalesItem"("locationId", "businessDate");

-- CreateIndex
CREATE INDEX "SalesItem_eventId_idx" ON "SalesItem"("eventId");

-- CreateIndex
CREATE INDEX "SalesItem_itemName_idx" ON "SalesItem"("itemName");

-- AddForeignKey
ALTER TABLE "SalesItem" ADD CONSTRAINT "SalesItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesItem" ADD CONSTRAINT "SalesItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
