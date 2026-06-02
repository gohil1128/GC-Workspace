-- Add CONTRACTOR to the ExpenseCategory enum.
-- This must run in its own migration (own transaction) so that the new
-- value is committed before any other migration uses it as a default.
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'CONTRACTOR';
