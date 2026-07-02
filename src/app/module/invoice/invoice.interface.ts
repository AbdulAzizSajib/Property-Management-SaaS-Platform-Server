import { PaymentStatus } from "../../../generated/prisma/enums";

export interface IGenerateInvoicePayload {
    leaseId: string;
    billingMonth: string;
    dueDate?: string;
    // Which earlier unpaid invoices of this lease to roll into this one.
    // Omit or pass [] to NOT carry any previous due — the invoice will then
    // only contain the current month's charges. Each id must be an outstanding
    // (DUE/PARTIAL/OVERDUE) earlier invoice of the same lease.
    carryForwardInvoiceIds?: string[];
    notes?: string;
}

export interface IGenerateMonthlyPayload {
    billingMonth: string;
    // Optional: only generate invoices for leases whose unit is in this building.
    buildingId?: string;
    // Bulk run defaults to carrying every outstanding balance forward. Pass
    // false to generate plain current-month invoices without any carry-over.
    carryForward?: boolean;
}

export interface IInvoiceQuery {
    leaseId?: string;
    tenantId?: string;
    unitId?: string;
    buildingId?: string;
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
    notes?: string;
}

export interface ICancelInvoicePayload {
    reason: string;
}
