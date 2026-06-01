-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buildingLimit" INTEGER NOT NULL,
    "unitLimit" INTEGER NOT NULL,
    "tenantLimit" INTEGER NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customBranding" BOOLEAN NOT NULL DEFAULT false,
    "multiAdmin" BOOLEAN NOT NULL DEFAULT false,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "trialDays" INTEGER,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfig_plan_key" ON "PlanConfig"("plan");
