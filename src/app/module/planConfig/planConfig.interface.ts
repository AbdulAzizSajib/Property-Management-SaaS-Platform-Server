import { SubscriptionPlan } from "../../../generated/prisma/enums";

export interface ICreatePlanConfigPayload {
    plan: SubscriptionPlan;
    displayName: string;
    description: string;
    buildingLimit: number;
    floorLimit: number;
    unitLimit: number;
    tenantLimit: number;
    smsEnabled?: boolean;
    customBranding?: boolean;
    multiAdmin?: boolean;
    priceMonthly: number;
    trialDays?: number | null;
    isPopular?: boolean;
    features: string[];
    isActive?: boolean;
}

export type IUpdatePlanConfigPayload = Partial<
    Omit<ICreatePlanConfigPayload, "plan">
>;
