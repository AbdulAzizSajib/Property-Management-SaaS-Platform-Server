import { BillingMode } from "../../../generated/prisma/enums";

export interface ICreateLeasePayload {
    tenantId: string;
    unitId: string;
    startDate: string;
    endDate?: string;
    moveInDate: string;
    monthlyRent: number;
    serviceCharge?: number;
    securityDeposit?: number;
    rentDueDay?: number;
    billingMode?: BillingMode;
    gasCharge?: number;
    waterCharge?: number;
    electricityCharge?: number;
    internetCharge?: number;
    notes?: string;
}

export interface ITerminateLeasePayload {
    moveOutDate: string;
    notes?: string;
}
