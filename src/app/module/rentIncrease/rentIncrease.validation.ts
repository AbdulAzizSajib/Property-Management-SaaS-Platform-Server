import z from "zod";

export const createRentIncreaseZodSchema = z.object({
    newRent: z.number().positive(),
    effectiveFrom: z.iso.datetime(),
    reason: z.string().max(500).optional(),
});
