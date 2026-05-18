import z from "zod";

export const createLeaseZodSchema = z.object({
    tenantId: z.string().min(1),
    unitId: z.string().min(1),
    startDate: z.iso.datetime().or(z.iso.date()),
    endDate: z.iso.datetime().or(z.iso.date()).optional(),
    moveInDate: z.iso.datetime().or(z.iso.date()),
    monthlyRent: z.number().min(0),
    serviceCharge: z.number().min(0).optional(),
    securityDeposit: z.number().min(0).optional(),
    rentDueDay: z.number().int().min(1).max(28).optional(),
    notes: z.string().max(500).optional(),
});

export const terminateLeaseZodSchema = z.object({
    moveOutDate: z.iso.datetime().or(z.iso.date()),
    notes: z.string().max(500).optional(),
});
