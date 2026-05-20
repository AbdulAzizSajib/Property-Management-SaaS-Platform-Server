import { SubscriptionPlan } from "../../../generated/prisma/enums";

export interface IPlanPreset {
    displayName: string;
    description: string;
    buildingLimit: number;
    unitLimit: number;
    tenantLimit: number;
    smsEnabled: boolean;
    customBranding: boolean;
    multiAdmin: boolean;
    priceMonthly: number;
    trialDays?: number;
    isPopular?: boolean;
    features: string[];
}

export const PLAN_PRESETS: Record<SubscriptionPlan, IPlanPreset> = {
    FREE_TRIAL: {
        displayName: "Free Trial",
        description: "30 days, no card required",
        buildingLimit: 1,
        unitLimit: 10,
        tenantLimit: 10,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 0,
        trialDays: 30,
        features: [
            "Up to 10 units",
            "Tenant & lease management",
            "bKash / Nagad rent collection",
            "Email support (Bangla & English)",
        ],
    },
    BASIC: {
        displayName: "Starter",
        description: "For small landlords",
        buildingLimit: 1,
        unitLimit: 10,
        tenantLimit: 10,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 999,
        features: [
            "Up to 10 units",
            "Tenant & lease management",
            "bKash / Nagad rent collection",
            "Auto SMS rent reminders",
            "Email support (Bangla & English)",
        ],
    },
    STANDARD: {
        displayName: "Professional",
        description: "For growing property businesses",
        buildingLimit: 10,
        unitLimit: 100,
        tenantLimit: 100,
        smsEnabled: true,
        customBranding: false,
        multiAdmin: true,
        priceMonthly: 2999,
        isPopular: true,
        features: [
            "Up to 100 units",
            "Everything in Starter",
            "Maintenance & complaint tracking",
            "Multi-property dashboard",
            "Service charge & utility bills",
            "Priority WhatsApp support",
        ],
    },
    ENTERPRISE: {
        displayName: "Enterprise",
        description: "For large portfolios",
        buildingLimit: 9999,
        unitLimit: 999999,
        tenantLimit: 999999,
        smsEnabled: true,
        customBranding: true,
        multiAdmin: true,
        priceMonthly: 7999,
        features: [
            "Unlimited units & properties",
            "Dedicated account manager",
            "Custom lease & legal templates",
            "API access & accounting export",
            "On-site onboarding in Dhaka/Ctg",
        ],
    },
};
