import { PaymentStatus } from "../../../generated/prisma/enums";

export interface IGenerateInvoicePayload {
    leaseId: string;
    billingMonth: string;
    dueDate?: string;
    utilityAmount?: number;
    penaltyAmount?: number;
    notes?: string;
}

export interface IGenerateMonthlyPayload {
    billingMonth: string;
}

export interface IInvoiceQuery {
    leaseId?: string;
    tenantId?: string;
    unitId?: string;
    status?: PaymentStatus;
}
