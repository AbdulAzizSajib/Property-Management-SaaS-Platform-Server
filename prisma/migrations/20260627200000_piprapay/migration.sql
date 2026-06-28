-- Add PIPRAPAY to PaymentMethod enum.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PIPRAPAY';

-- Online flow fills sender/txn after the fact, so make them nullable.
ALTER TABLE "SubscriptionRequest" ALTER COLUMN "senderNumber" DROP NOT NULL;
ALTER TABLE "SubscriptionRequest" ALTER COLUMN "transactionId" DROP NOT NULL;

-- PipraPay tracking columns.
ALTER TABLE "SubscriptionRequest" ADD COLUMN "ppId" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN "checkoutUrl" TEXT;
