-- BillingMode + per-utility fixed charges on Lease,
-- and LineItemCategory + category field on InvoiceLineItem.

CREATE TYPE "BillingMode" AS ENUM ('INCLUSIVE', 'FIXED_SEPARATE');

CREATE TYPE "LineItemCategory" AS ENUM (
    'RENT',
    'SERVICE_CHARGE',
    'GAS',
    'WATER',
    'ELECTRICITY',
    'INTERNET',
    'PENALTY',
    'OTHER'
);

ALTER TABLE "Lease"
    ADD COLUMN "billingMode"       "BillingMode" NOT NULL DEFAULT 'INCLUSIVE',
    ADD COLUMN "gasCharge"         DECIMAL(12, 2),
    ADD COLUMN "waterCharge"       DECIMAL(12, 2),
    ADD COLUMN "electricityCharge" DECIMAL(12, 2),
    ADD COLUMN "internetCharge"    DECIMAL(12, 2);

ALTER TABLE "InvoiceLineItem"
    ADD COLUMN "category" "LineItemCategory" NOT NULL DEFAULT 'OTHER';

CREATE INDEX "InvoiceLineItem_category_idx" ON "InvoiceLineItem"("category");
