import z from "zod";
import { ExpenseCategory, PaymentMethod } from "../../../generated/prisma/enums";

const expenseCategoryValues = Object.values(ExpenseCategory) as [string, ...string[]];
const paymentMethodValues = Object.values(PaymentMethod) as [string, ...string[]];

export const createExpenseZodSchema = z.object({
    title: z.string().min(1).max(200),
    category: z.enum(expenseCategoryValues),
    amount: z.number().positive(),
    expenseDate: z.iso.datetime().optional(),
    paidTo: z.string().max(100).optional(),
    paymentMethod: z.enum(paymentMethodValues).optional(),
    receiptUrl: z.url().optional(),
    notes: z.string().max(500).optional(),
    buildingId: z.string().optional(),
    unitId: z.string().optional(),
});

export const updateExpenseZodSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    category: z.enum(expenseCategoryValues).optional(),
    amount: z.number().positive().optional(),
    expenseDate: z.iso.datetime().optional(),
    paidTo: z.string().max(100).optional(),
    paymentMethod: z.enum(paymentMethodValues).optional(),
    receiptUrl: z.url().optional(),
    notes: z.string().max(500).optional(),
});
