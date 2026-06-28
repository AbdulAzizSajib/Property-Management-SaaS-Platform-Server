-- Remove the unused PipraPay tracking columns.
-- NOTE: the PIPRAPAY value on the PaymentMethod enum is intentionally kept —
-- PostgreSQL cannot drop an enum value without recreating the type, and it is
-- harmless (unused). senderNumber/transactionId stay nullable.
ALTER TABLE "SubscriptionRequest" DROP COLUMN IF EXISTS "ppId";
ALTER TABLE "SubscriptionRequest" DROP COLUMN IF EXISTS "checkoutUrl";
