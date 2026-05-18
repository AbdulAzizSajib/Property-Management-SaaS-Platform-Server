import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
    SubscriptionPlan,
    SubscriptionStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { IChangePlanPayload } from "./subscription.interface";
import { PLAN_PRESETS } from "./subscription.constants";

const buildSubscriptionData = (plan: SubscriptionPlan) => {
    const preset = PLAN_PRESETS[plan];
    const now = new Date();
    const isTrial = plan === SubscriptionPlan.FREE_TRIAL;

    return {
        plan,
        status: isTrial
            ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE,
        buildingLimit: preset.buildingLimit,
        unitLimit: preset.unitLimit,
        tenantLimit: preset.tenantLimit,
        smsEnabled: preset.smsEnabled,
        customBranding: preset.customBranding,
        multiAdmin: preset.multiAdmin,
        priceMonthly: new Prisma.Decimal(preset.priceMonthly),
        trialEndsAt: isTrial && preset.trialDays
            ? new Date(now.getTime() + preset.trialDays * 24 * 60 * 60 * 1000)
            : null,
        startDate: now,
        endDate: null,
        autoRenew: !isTrial,
    };
};

const createTrialSubscriptionForOrg = async (
    organizationId: string,
    tx: Prisma.TransactionClient,
) => {
    return tx.subscription.create({
        data: {
            ...buildSubscriptionData(SubscriptionPlan.FREE_TRIAL),
            organizationId,
        },
    });
};

const getMySubscription = async (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(
            status.BAD_REQUEST,
            "User is not associated with any organization",
        );
    }

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: user.organizationId },
        include: { organization: true },
    });

    if (!subscription) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }

    return subscription;
};

const changePlan = async (user: IRequestUser, payload: IChangePlanPayload) => {
    if (!user.organizationId) {
        throw new AppError(
            status.BAD_REQUEST,
            "User is not associated with any organization",
        );
    }

    const existing = await prisma.subscription.findUnique({
        where: { organizationId: user.organizationId },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }

    if (existing.plan === payload.plan) {
        throw new AppError(
            status.BAD_REQUEST,
            `Already on ${payload.plan} plan`,
        );
    }

    const updated = await prisma.subscription.update({
        where: { organizationId: user.organizationId },
        data: buildSubscriptionData(payload.plan),
    });

    return updated;
};

export const SubscriptionService = {
    createTrialSubscriptionForOrg,
    getMySubscription,
    changePlan,
};
