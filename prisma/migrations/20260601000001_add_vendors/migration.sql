-- AlterTable: add vendorId and isIncentive to Expense
ALTER TABLE "Expense" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "isIncentive" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Vendor
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "country" TEXT,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "defaultCategory" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "isFlatFee" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Vendor_businessId_idx" ON "Vendor"("businessId");
CREATE INDEX "Expense_vendorId_idx" ON "Expense"("vendorId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
