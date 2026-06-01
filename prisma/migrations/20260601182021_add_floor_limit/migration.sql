-- AlterTable: PlanConfig.floorLimit — add as nullable, backfill, then enforce NOT NULL
ALTER TABLE "PlanConfig" ADD COLUMN "floorLimit" INTEGER;

UPDATE "PlanConfig" SET "floorLimit" = CASE
    WHEN "plan" = 'FREE_TRIAL'  THEN 2
    WHEN "plan" = 'BASIC'       THEN 2
    WHEN "plan" = 'STANDARD'    THEN 20
    WHEN "plan" = 'ENTERPRISE'  THEN 9999
    ELSE 2
END;

ALTER TABLE "PlanConfig" ALTER COLUMN "floorLimit" SET NOT NULL;

-- AlterTable: Subscription.floorLimit
ALTER TABLE "Subscription" ADD COLUMN "floorLimit" INTEGER NOT NULL DEFAULT 2;
