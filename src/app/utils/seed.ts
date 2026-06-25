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
        unitLimit: 9,
        tenantLimit: 9,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 0,
        isPopular: false,
        features: [
            "Up to 9 units",
            "Tenant & lease management",
            "Email support (Bangla & English)",
        ],
    },
    {
        plan: SubscriptionPlan.BASIC,
        displayName: "Starter",
        description: "For small landlords",
        buildingLimit: 1,
        floorLimit: 10,
        unitLimit: 30,
        tenantLimit: 30,
        smsEnabled: false,
        customBranding: false,
        multiAdmin: false,
        priceMonthly: 299,
        isPopular: false,
        features: [
            "Up to 30 units",
            "Tenant & lease management",
            "Auto SMS rent reminders",
            "Email support (Bangla & English)",
        ],
    },
    {
        plan: SubscriptionPlan.STANDARD,
        displayName: "Professional",
        description: "For growing property businesses",
        buildingLimit: 3,
        floorLimit: 30,
        unitLimit: 90,
        tenantLimit: 90,
        smsEnabled: true,
        customBranding: false,
        multiAdmin: true,
        priceMonthly: 799,
        isPopular: true,
        features: [
            "Up to 90 units",
            "Everything in Starter",
            "Maintenance & complaint tracking",
            "Multi-property dashboard",
            "Service charge & utility bills",
            "Priority WhatsApp support",
        ],
    },
    {
        plan: SubscriptionPlan.BUSINESS,
        displayName: "Business",
        description: "For large portfolios",
        buildingLimit: 10,
        floorLimit: 100,
        unitLimit: 300,
        tenantLimit: 300,
        smsEnabled: true,
        customBranding: true,
        multiAdmin: true,
        priceMonthly: 1499,
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
