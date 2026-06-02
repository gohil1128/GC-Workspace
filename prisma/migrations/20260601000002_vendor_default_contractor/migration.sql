-- Flip the default category for a newly created Vendor to CONTRACTOR.
-- The enum value already exists from the earlier migration.
ALTER TABLE "Vendor" ALTER COLUMN "defaultCategory" SET DEFAULT 'CONTRACTOR';
