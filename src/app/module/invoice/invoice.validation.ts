import z from "zod";

export const generateInvoiceZodSchema = z.object({
    leaseId: z.string().min(1),
    billingMonth: z.iso.datetime().or(z.iso.date()),
    dueDate: z.iso.datetime().or(z.iso.date()).optional(),
    utilityAmount: z.number().min(0).optional(),
    utilities: z
        .object({
            gas: z.number().min(0).optional(),
            water: z.number().min(0).optional(),
            electricity: z.number().min(0).optional(),
            internet: z.number().min(0).optional(),
        })
        .optional(),
    penaltyAmount: z.number().min(0).optional(),
    carryForwardInvoiceIds: z.array(z.string().min(1)).optional(),
    notes: z.string().max(500).optional(),
});

export const generateMonthlyZodSchema = z.object({
    billingMonth: z.iso.datetime().or(z.iso.date()),
    carryForward: z.boolean().optional(),
});

export const updateInvoiceZodSchema = z.object({
    dueDate: z.iso.datetime().or(z.iso.date()).optional(),
    penaltyAmount: z.number().min(0).optional(),
    utilityAmount: z.number().min(0).optional(),
    utilities: z
        .object({
            gas: z.number().min(0).optional(),
            water: z.number().min(0).optional(),
            electricity: z.number().min(0).optional(),
            internet: z.number().min(0).optional(),
        })
        .optional(),
    notes: z.string().max(500).optional(),
});

export const cancelInvoiceZodSchema = z.object({
    reason: z
        .string("Cancellation reason is required")
        .min(5, "Reason must be at least 5 characters")
        .max(500, "Reason must be at most 500 characters"),
});
