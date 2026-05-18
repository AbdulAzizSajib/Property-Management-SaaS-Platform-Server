import { SubscriptionPlan } from "../../../generated/prisma/enums";

export interface IChangePlanPayload {
    plan: SubscriptionPlan;
}
