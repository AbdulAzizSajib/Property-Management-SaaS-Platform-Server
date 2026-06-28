import z from "zod";
import {
    PaymentMethod,
    SubscriptionPlan,
} from "../../../generated/prisma/enums";

// Only paid plans can be requested — FREE needs no payment.
export const createSubscriptionRequestZodSchema = z.object({
    targetPlan: z.enum(
        [
            SubscriptionPlan.BASIC,
            SubscriptionPlan.STANDARD,
            SubscriptionPlan.BUSINESS,
        ],
        "Plan must be one of BASIC, STANDARD, BUSINESS",
    ),
    method: z.enum(
        [
            PaymentMethod.BKASH,
            PaymentMethod.NAGAD,
            PaymentMethod.ROCKET,
            PaymentMethod.BANK_TRANSFER,
        ],
        "Unsupported payment method",
    ),
    senderNumber: z
        .string()
        .min(6, "Enter the number the money was sent from")
        .max(20),
    transactionId: z
        .string()
        .min(4, "Enter the transaction id (TrxID)")
        .max(64),
});

export const approveSubscriptionRequestZodSchema = z.object({
    note: z.string().max(500).optional(),
});

export const rejectSubscriptionRequestZodSchema = z.object({
    note: z
        .string("A reason is required")
        .min(3, "Reason must be at least 3 characters")
        .max(500),
});
