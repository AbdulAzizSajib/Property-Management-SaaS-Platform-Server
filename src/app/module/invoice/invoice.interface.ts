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
    // Single status or comma-separated list, e.g. "DUE,PARTIAL,OVERDUE"
    status?: PaymentStatus | string;
    // Single billing month — accepts "YYYY-MM" or any parseable date in that month
    billingMonth?: string;
    // Range filter on billingMonth (inclusive). Either or both may be supplied.
    billingMonthFrom?: string;
    billingMonthTo?: string;
    // "billingMonth_asc" | "billingMonth_desc" (default). Asc = oldest unpaid first.
    sort?: string;
}

export interface IUpdateInvoicePayload {
    dueDate?: string;
    penaltyAmount?: number;
    utilityAmount?: number;
    utilities?: {
        gas?: number;
        water?: number;
        electricity?: number;
        internet?: number;
    };
    notes?: string;
}

export interface ICancelInvoicePayload {
    reason: string;
}
