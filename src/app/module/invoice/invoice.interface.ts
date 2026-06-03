import { PaymentStatus } from "../../../generated/prisma/enums";

export interface IGenerateInvoicePayload {
    leaseId: string;
    billingMonth: string;
    dueDate?: string;
    // Legacy single-amount field (used for INCLUSIVE mode or one-off utility fee)
    utilityAmount?: number;
    // Override lease-level fixed utility charges for this invoice only
    utilities?: {
        gas?: number;
        water?: number;
        electricity?: number;
        internet?: number;
    };
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
