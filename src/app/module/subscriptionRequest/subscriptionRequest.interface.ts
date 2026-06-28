import {
    PaymentMethod,
    SubscriptionPlan,
} from "../../../generated/prisma/enums";

export interface ICreateSubscriptionRequestPayload {
    targetPlan: SubscriptionPlan;
    method: PaymentMethod;
    senderNumber: string;
    transactionId: string;
}

export interface IReviewSubscriptionRequestPayload {
    note?: string;
}
