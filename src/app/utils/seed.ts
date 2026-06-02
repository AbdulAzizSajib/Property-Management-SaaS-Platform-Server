import { Prisma } from "../../generated/prisma/client";
import {
    Role,
    SubscriptionPlan,
} from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
    try {
        if (!envVars.SUPER_ADMIN_EMAIL || !envVars.SUPER_ADMIN_PASSWORD) {
            console.log(
                "SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seeding.",
            );
            return;
        }

        const isSuperAdminExist = await prisma.user.findFirst({
            where: { role: Role.SUPER_ADMIN },
        });

        if (isSuperAdminExist) {
            console.log("Super admin already exists. Skipping.");
            return;
        }

        const superAdminUser = await auth.api.signUpEmail({
            body: {
                email: envVars.SUPER_ADMIN_EMAIL,
                password: envVars.SUPER_ADMIN_PASSWORD,
                name: "Super Admin",
                rememberMe: false,
            },
        });

        const superAdmin = await prisma.user.update({
            where: { id: superAdminUser.user.id },
            data: {
                emailVerified: true,
                role: Role.SUPER_ADMIN,
                isActive: true,
            },
        });

        console.log("Super Admin Created:", superAdmin.email);
    } catch (error) {
        console.error("Error seeding super admin:", error);
    }
};

const PLAN_CONFIGS: Array<{
    plan: SubscriptionPlan;
    displayName: string;
    description: string;
    buildingLimit: number;
    floorLimit: number;
    unitLimit: number;
    tenantLimit: number;
    smsEnabled: boolean;
    customBranding: boolean;
    multiAdmin: boolean;
    priceMonthly: number;
    trialDays?: number;
    isPopular: boolean;
    features: string[];
}> = [
    {
        plan: SubscriptionPlan.FREE,
        displayName: "Free",
        description: "Free forever, no card required",
        buildingLimit: 1,
        floorLimit: 3,
        unitLimit: 2,
        tenantLimit: 6,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 0,
        isPopular: false,
        features: [
            "Up to 6 units",
            "Tenant & lease management",
            "bKash / Nagad rent collection",
            "Email support (Bangla & English)",
        ],
    },
    {
        plan: SubscriptionPlan.BASIC,
        displayName: "Starter",
        description: "For small landlords",
        buildingLimit: 1,
        floorLimit: 5,
        unitLimit: 10,
        tenantLimit: 10,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 999,
        isPopular: false,
        features: [
            "Up to 10 units",
            "Tenant & lease management",
            "bKash / Nagad rent collection",
            "Auto SMS rent reminders",
            "Email support (Bangla & English)",
        ],
    },
    {
        plan: SubscriptionPlan.STANDARD,
        displayName: "Professional",
        description: "For growing property businesses",
        buildingLimit: 10,
        floorLimit: 50,
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
    {
        plan: SubscriptionPlan.ENTERPRISE,
        displayName: "Enterprise",
        description: "For large portfolios",
        buildingLimit: 9999,
        floorLimit: 99999,
        unitLimit: 999999,
        tenantLimit: 999999,
        smsEnabled: true,
        customBranding: true,
        multiAdmin: true,
        priceMonthly: 7999,
        isPopular: false,
        features: [
            "Unlimited units & properties",
            "Dedicated account manager",
            "Custom lease & legal templates",
            "API access & accounting export",
            "On-site onboarding in Dhaka/Ctg",
        ],
    },
];

export const seedPlanConfigs = async () => {
    try {
        for (const config of PLAN_CONFIGS) {
            const { plan, priceMonthly, ...rest } = config;
            await prisma.planConfig.upsert({
                where: { plan },
                create: {
                    plan,
                    priceMonthly: new Prisma.Decimal(priceMonthly),
                    ...rest,
                },
                update: {
                    priceMonthly: new Prisma.Decimal(priceMonthly),
                    ...rest,
                },
            });
        }
        console.log(`Plan configs seeded: ${PLAN_CONFIGS.length} plans`);
    } catch (error) {
        console.error("Error seeding plan configs:", error);
    }
};
