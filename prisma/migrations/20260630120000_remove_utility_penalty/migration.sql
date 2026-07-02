-- Remove the utility & penalty feature.
--
-- NOTE: enum *values* are intentionally NOT removed. PostgreSQL cannot drop an
-- enum value that existing rows may reference, and it is harmless to leave the
-- now-unused values in place:
--   * LineItemCategory keeps GAS / WATER / ELECTRICITY / INTERNET / PENALTY
--   * InvoiceType keeps UTILITY / PENALTY
-- They are simply no longer produced by the application.

-- Invoice: drop the utility/penalty amount columns
ALTER TABLE "Invoice" DROP COLUMN "utilityAmount";
ALTER TABLE "Invoice" DROP COLUMN "penaltyAmount";

-- Lease: drop billing mode + fixed monthly utility charge columns
ALTER TABLE "Lease" DROP COLUMN "billingMode";
ALTER TABLE "Lease" DROP COLUMN "gasCharge";
ALTER TABLE "Lease" DROP COLUMN "waterCharge";
ALTER TABLE "Lease" DROP COLUMN "electricityCharge";
ALTER TABLE "Lease" DROP COLUMN "internetCharge";

-- The BillingMode enum is now unused (its only column was dropped above)
DROP TYPE "BillingMode";
