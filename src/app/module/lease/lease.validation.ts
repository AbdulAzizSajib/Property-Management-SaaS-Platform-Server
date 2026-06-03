import z from "zod";
import { BillingMode } from "../../../generated/prisma/enums";

const utilityAmount = z.number().min(0).optional();

export const createLeaseZodSchema = z
    .object({
        tenantId: z.string().min(1),
        unitId: z.string().min(1),
        startDate: z.iso.datetime().or(z.iso.date()),
        endDate: z.iso.datetime().or(z.iso.date()).optional(),
        moveInDate: z.iso.datetime().or(z.iso.date()),
        monthlyRent: z.number().min(0),
        serviceCharge: z.number().min(0).optional(),
        securityDeposit: z.number().min(0).optional(),
        rentDueDay: z.number().int().min(1).max(28).optional(),
        billingMode: z
            .enum([BillingMode.INCLUSIVE, BillingMode.FIXED_SEPARATE])
            .optional(),
        gasCharge: utilityAmount,
        waterCharge: utilityAmount,
        electricityCharge: utilityAmount,
        internetCharge: utilityAmount,
        notes: z.string().max(500).optional(),
    })
    .refine(
        (data) => {
            if (data.billingMode !== BillingMode.FIXED_SEPARATE) return true;
            return (
                (data.gasCharge ?? 0) +
                    (data.waterCharge ?? 0) +
                    (data.electricityCharge ?? 0) +
                    (data.internetCharge ?? 0) >
                0
            );
        },
        {
            message:
                "FIXED_SEPARATE billing requires at least one utility charge (gas/water/electricity/internet)",
            path: ["billingMode"],
        },
    );

export const terminateLeaseZodSchema = z.object({
    moveOutDate: z.iso.datetime().or(z.iso.date()),
    notes: z.string().max(500).optional(),
});
