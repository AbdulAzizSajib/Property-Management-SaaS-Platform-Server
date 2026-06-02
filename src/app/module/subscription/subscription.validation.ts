import z from "zod";
import {
    SubscriptionPlan,
    SubscriptionStatus,
} from "../../../generated/prisma/enums";

export const changePlanZodSchema = z.object({
    plan: z.enum(
        [
            SubscriptionPlan.FREE,
            SubscriptionPlan.BASIC,
            SubscriptionPlan.STANDARD,
            SubscriptionPlan.ENTERPRISE,
        ],
        "Plan must be one of FREE_TRIAL, BASIC, STANDARD, ENTERPRISE",
    ),
});

export const adminUpdateSubscriptionZodSchema = z.object({
    plan: z
        .enum([
            SubscriptionPlan.FREE,
            SubscriptionPlan.BASIC,
            SubscriptionPlan.STANDARD,
            SubscriptionPlan.ENTERPRISE,
        ])
        .optional(),
    status: z
        .enum([
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED,
        ])
        .optional(),
    endDate: z.iso.datetime().nullable().optional(),
    autoRenew: z.boolean().optional(),
});
