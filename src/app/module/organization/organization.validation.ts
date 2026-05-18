import z from "zod";

export const updateOrganizationZodSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    logoUrl: z.url("Logo URL must be a valid URL").optional(),
    phone: z.string().min(11).max(15).optional(),
    email: z.email("Invalid organization email").optional(),
    address: z.string().max(200).optional(),
});
