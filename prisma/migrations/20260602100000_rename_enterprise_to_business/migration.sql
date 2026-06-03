-- Rename SubscriptionPlan enum value ENTERPRISE -> BUSINESS, preserving data.

BEGIN;

CREATE TYPE "SubscriptionPlan_new" AS ENUM ('FREE', 'BASIC', 'STANDARD', 'BUSINESS');

ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "Subscription"
    ALTER COLUMN "plan" TYPE "SubscriptionPlan_new"
    USING (
        CASE "plan"::text
            WHEN 'ENTERPRISE' THEN 'BUSINESS'
            ELSE "plan"::text
        END
    )::"SubscriptionPlan_new";

ALTER TABLE "PlanConfig"
    ALTER COLUMN "plan" TYPE "SubscriptionPlan_new"
    USING (
        CASE "plan"::text
            WHEN 'ENTERPRISE' THEN 'BUSINESS'
            ELSE "plan"::text
        END
    )::"SubscriptionPlan_new";

DROP TYPE "SubscriptionPlan";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';

COMMIT;
