-- Rename SubscriptionPlan enum value FREE_TRIAL -> FREE, preserving data.
-- Postgres does not support renaming an enum value while preserving column references
-- when other constraints/defaults reference the old value, so we recreate the type.

BEGIN;

-- 1. Create the new enum type with the desired values
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('FREE', 'BASIC', 'STANDARD', 'ENTERPRISE');

-- 2. Drop defaults that reference the old enum so we can alter column types
ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;

-- 3. Convert existing columns to the new enum, mapping FREE_TRIAL -> FREE
ALTER TABLE "Subscription"
    ALTER COLUMN "plan" TYPE "SubscriptionPlan_new"
    USING (
        CASE "plan"::text
            WHEN 'FREE_TRIAL' THEN 'FREE'
            ELSE "plan"::text
        END
    )::"SubscriptionPlan_new";

ALTER TABLE "PlanConfig"
    ALTER COLUMN "plan" TYPE "SubscriptionPlan_new"
    USING (
        CASE "plan"::text
            WHEN 'FREE_TRIAL' THEN 'FREE'
            ELSE "plan"::text
        END
    )::"SubscriptionPlan_new";

-- 4. Drop old enum and rename the new one in its place
DROP TYPE "SubscriptionPlan";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

-- 5. Restore default (now references the renamed type and uses FREE)
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- 6. Update default subscription status to ACTIVE (free tier is not a trial)
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

COMMIT;
