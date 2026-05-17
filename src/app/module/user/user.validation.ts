import z from "zod";
import { Role } from "../../../generated/prisma/enums";

export const createStaffZodSchema = z.object({
    password: z
        .string("Password is required")
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be at most 50 characters"),
    role: z.enum(
        [Role.MANAGER, Role.CARETAKER],
        "Role must be either MANAGER or CARETAKER",
    ),
    user: z.object({
        name: z
            .string("Name is required")
            .min(3, "Name must be at least 3 characters")
            .max(50, "Name must be at most 50 characters"),
        email: z.email("Invalid email address"),
        contactNumber: z
            .string()
            .min(11, "Contact number must be at least 11 characters")
            .max(15, "Contact number must be at most 15 characters")
            .optional(),
        image: z.url("Image must be a valid URL").optional(),
    }),
    buildingIds: z.array(z.string()).optional(),
});

export const createTenantZodSchema = z.object({
    tenant: z.object({
        name: z
            .string("Name is required")
            .min(3, "Name must be at least 3 characters")
            .max(50, "Name must be at most 50 characters"),
        phone: z
            .string("Phone is required")
            .min(11, "Phone must be at least 11 characters")
            .max(15, "Phone must be at most 15 characters"),
        email: z.email("Invalid email address").optional(),
        nidNumber: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyName: z.string().optional(),
        occupation: z.string().optional(),
        permanentAddress: z.string().max(200).optional(),
        photoUrl: z.url("Photo must be a valid URL").optional(),
    }),
    createLoginAccount: z.boolean().optional(),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be at most 50 characters")
        .optional(),
});

export const updateUserZodSchema = z.object({
    name: z.string().min(3).max(50).optional(),
    contactNumber: z.string().min(11).max(15).optional(),
    image: z.url("Image must be a valid URL").optional(),
    isActive: z.boolean().optional(),
});
