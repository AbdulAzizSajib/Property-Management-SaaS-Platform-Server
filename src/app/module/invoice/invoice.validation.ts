import z from "zod";

export const generateInvoiceZodSchema = z.object({
    leaseId: z.string().min(1),
    billingMonth: z.iso.datetime().or(z.iso.date()),
    dueDate: z.iso.datetime().or(z.iso.date()).optional(),
    utilityAmount: z.number().min(0).optional(),
    penaltyAmount: z.number().min(0).optional(),
    notes: z.string().max(500).optional(),
});

export const generateMonthlyZodSchema = z.object({
    billingMonth: z.iso.datetime().or(z.iso.date()),
});
