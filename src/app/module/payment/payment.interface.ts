import { PaymentMethod } from "../../../generated/prisma/enums";

export interface ICreatePaymentPayload {
    invoiceId: string;
    amount: number;
    method?: PaymentMethod;
    transactionId?: string;
    paidAt?: string;
    notes?: string;
    receiptUrl?: string;
}

export interface IPaymentQuery {
    leaseId?: string;
    tenantId?: string;
    invoiceId?: string;
}
