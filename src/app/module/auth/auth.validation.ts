import z from "zod";

export const registerOwnerZodSchema = z.object({
    name: z
        .string("Name is required and must be string")
        .min(3, "Name must be at least 3 characters")
        .max(50, "Name must be at most 50 characters"),
    email: z.email("Invalid email address"),
    password: z
        .string("Password is required")
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be at most 50 characters"),
    contactNumber: z
        .string()
        .min(11, "Contact number must be at least 11 characters")
        .max(15, "Contact number must be at most 15 characters")
        .optional(),
    organization: z.object({
        name: z
            .string("Organization name is required")
            .min(2, "Organization name must be at least 2 characters")
            .max(100, "Organization name must be at most 100 characters"),
        slug: z
            .string("Organization slug is required")
            .min(2, "Slug must be at least 2 characters")
            .max(60, "Slug must be at most 60 characters")
            .regex(
                /^[a-z0-9-]+$/,
                "Slug must contain only lowercase letters, numbers, and hyphens",
            ),
        phone: z.string().optional(),
        email: z.email("Invalid organization email").optional(),
        address: z.string().max(200).optional(),
    }),
});

export const loginUserZodSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string("Password is required").min(1, "Password is required"),
});

export const changePasswordZodSchema = z.object({
    currentPassword: z.string("Current password is required").min(1),
    newPassword: z
        .string("New password is required")
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be at most 50 characters"),
});

export const verifyEmailZodSchema = z.object({
    email: z.email("Invalid email address"),
    otp: z
        .string("OTP is required")
        .length(6, "OTP must be exactly 6 digits"),
});

export const forgetPasswordZodSchema = z.object({
    email: z.email("Invalid email address"),
});

export const resetPasswordZodSchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string("OTP is required").length(6, "OTP must be exactly 6 digits"),
    newPassword: z
        .string("New password is required")
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password must be at most 50 characters"),
});
