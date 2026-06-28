-- Add CARRIED_FORWARD to PaymentStatus enum.
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in older Postgres.
-- Prisma wraps each migration in a transaction. If this fails, run manually via psql.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CARRIED_FORWARD';

-- Carry-forward tracking columns on Invoice.
ALTER TABLE "Invoice" ADD COLUMN "carriedForwardToId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "carriedForwardAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invoice_carriedForwardToId_idx" ON "Invoice"("carriedForwardToId");

-- AddForeignKey (self-relation: an invoice points to the newer invoice that absorbed its due)
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_carriedForwardToId_fkey"
    FOREIGN KEY ("carriedForwardToId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
