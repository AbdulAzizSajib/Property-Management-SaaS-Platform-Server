import { SubscriptionPlan } from "../../../generated/prisma/enums";

export interface IPlanPreset {
    buildingLimit: number;
    unitLimit: number;
    tenantLimit: number;
    smsEnabled: boolean;
    customBranding: boolean;
    multiAdmin: boolean;
    priceMonthly: number;
    trialDays?: number;
}

export const PLAN_PRESETS: Record<SubscriptionPlan, IPlanPreset> = {
    FREE_TRIAL: {
        buildingLimit: 1,
        unitLimit: 10,
        tenantLimit: 10,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 0,
        trialDays: 14,
    },
    BASIC: {
        buildingLimit: 2,
        unitLimit: 20,
        tenantLimit: 20,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 999,
    },
    STANDARD: {
        buildingLimit: 10,
        unitLimit: 200,
        tenantLimit: 200,
        smsEnabled: true,
        customBranding: false,
        multiAdmin: true,
        priceMonthly: 2499,
    },
    ENTERPRISE: {
        buildingLimit: 999,
        unitLimit: 99999,
        tenantLimit: 99999,
        smsEnabled: true,
        customBranding: true,
        multiAdmin: true,
        priceMonthly: 7999,
    },
};
