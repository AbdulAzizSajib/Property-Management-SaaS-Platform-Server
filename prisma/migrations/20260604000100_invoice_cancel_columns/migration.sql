-- Add cancellation metadata columns to Invoice

ALTER TABLE "Invoice"
    ADD COLUMN "cancelledAt"  TIMESTAMP(3),
    ADD COLUMN "cancelReason" TEXT;
