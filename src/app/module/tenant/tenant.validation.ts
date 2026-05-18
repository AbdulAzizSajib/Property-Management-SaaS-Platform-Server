import z from "zod";

export const createTenantZodSchema = z.object({
    name: z.string().min(3).max(50),
    phone: z.string().min(11).max(15),
    email: z.email().optional(),
    nidNumber: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyName: z.string().optional(),
    occupation: z.string().optional(),
    permanentAddress: z.string().max(200).optional(),
    photoUrl: z.url().optional(),
    createLoginAccount: z.boolean().optional(),
    password: z.string().min(6).max(50).optional(),
});

export const updateTenantZodSchema = z.object({
    name: z.string().min(3).max(50).optional(),
    phone: z.string().min(11).max(15).optional(),
    email: z.email().optional(),
    nidNumber: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyName: z.string().optional(),
    occupation: z.string().optional(),
    permanentAddress: z.string().max(200).optional(),
    photoUrl: z.url().optional(),
    isActive: z.boolean().optional(),
});
