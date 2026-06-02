import z from "zod";
import { SubscriptionPlan } from "../../../generated/prisma/enums";

const planEnum = z.enum([
    SubscriptionPlan.FREE,
    SubscriptionPlan.BASIC,
    SubscriptionPlan.STANDARD,
    SubscriptionPlan.ENTERPRISE,
]);

export const createPlanConfigZodSchema = z.object({
    plan: planEnum,
    displayName: z.string().min(1),
    description: z.string().min(1),
    buildingLimit: z.number().int().min(0),
    floorLimit: z.number().int().min(0),
    unitLimit: z.number().int().min(0),
    tenantLimit: z.number().int().min(0),
    smsEnabled: z.boolean().optional(),
    customBranding: z.boolean().optional(),
    multiAdmin: z.boolean().optional(),
    priceMonthly: z.number().min(0),
    trialDays: z.number().int().min(0).nullable().optional(),
    isPopular: z.boolean().optional(),
    features: z.array(z.string()).default([]),
    isActive: z.boolean().optional(),
});

export const updatePlanConfigZodSchema = z.object({
    displayName: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    buildingLimit: z.number().int().min(0).optional(),
    floorLimit: z.number().int().min(0).optional(),
    unitLimit: z.number().int().min(0).optional(),
    tenantLimit: z.number().int().min(0).optional(),
    smsEnabled: z.boolean().optional(),
    customBranding: z.boolean().optional(),
    multiAdmin: z.boolean().optional(),
    priceMonthly: z.number().min(0).optional(),
    trialDays: z.number().int().min(0).nullable().optional(),
    isPopular: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});
