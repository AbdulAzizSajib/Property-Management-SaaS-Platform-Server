import z from "zod";
import { SubscriptionPlan } from "../../../generated/prisma/enums";

export const changePlanZodSchema = z.object({
    plan: z.enum(
        [
            SubscriptionPlan.FREE_TRIAL,
            SubscriptionPlan.BASIC,
            SubscriptionPlan.STANDARD,
            SubscriptionPlan.ENTERPRISE,
        ],
        "Plan must be one of FREE_TRIAL, BASIC, STANDARD, ENTERPRISE",
    ),
});
