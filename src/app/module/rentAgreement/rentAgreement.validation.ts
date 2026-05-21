import z from "zod";

export const createRentAgreementZodSchema = z.object({
    content: z.string().optional(),
    validFrom: z.iso.datetime().optional(),
    validUntil: z.iso.datetime().optional(),
});

export const signRentAgreementZodSchema = z.object({
    role: z.enum(["owner", "tenant"]),
    signatureUrl: z.url().optional(),
});
