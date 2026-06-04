-- Add CANCELLED to PaymentStatus enum.
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in older Postgres.
-- Prisma 7 wraps each migration in a transaction. If this fails, run manually via psql.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
