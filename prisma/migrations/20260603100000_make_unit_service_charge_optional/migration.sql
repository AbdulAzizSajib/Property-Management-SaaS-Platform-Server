-- Make Unit.serviceCharge nullable and drop the default.
-- Existing rows with value 0 (the prior default) remain as 0; new rows can be null.

ALTER TABLE "Unit"
    ALTER COLUMN "serviceCharge" DROP DEFAULT,
    ALTER COLUMN "serviceCharge" DROP NOT NULL;
