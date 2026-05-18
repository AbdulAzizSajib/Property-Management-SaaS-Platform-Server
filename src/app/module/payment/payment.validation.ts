import z from "zod";
import { PaymentMethod } from "../../../generated/prisma/enums";

export const createPaymentZodSchema = z.object({
    invoiceId: z.string().min(1),
    amount: z.number().positive(),
    method: z
        .enum(
            [
                PaymentMethod.CASH,
                PaymentMethod.BKASH,
                PaymentMethod.NAGAD,
                PaymentMethod.ROCKET,
                PaymentMethod.BANK_TRANSFER,
                PaymentMethod.SSLCOMMERZ,
                PaymentMethod.CARD,
                PaymentMethod.CHEQUE,
            ],
            "Invalid payment method",
        )
        .optional(),
    transactionId: z.string().optional(),
    paidAt: z.iso.datetime().optional(),
    notes: z.string().max(500).optional(),
    receiptUrl: z.url().optional(),
});
