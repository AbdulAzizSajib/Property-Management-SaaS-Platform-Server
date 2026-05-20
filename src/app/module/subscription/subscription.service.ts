import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
    SubscriptionPlan,
    SubscriptionStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { PLAN_PRESETS } from "./subscription.constants";
import { IChangePlanPayload } from "./subscription.interface";

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
        trialEndsAt:
            isTrial && preset.trialDays
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

const getAllPlans = () => {
    return Object.entries(PLAN_PRESETS)
        .filter(([key]) => key !== SubscriptionPlan.FREE_TRIAL)
        .map(([key, preset]) => ({
            plan: key as SubscriptionPlan,
            displayName: preset.displayName,
            description: preset.description,
            priceMonthly: preset.priceMonthly,
            buildingLimit: preset.buildingLimit,
            unitLimit: preset.unitLimit,
            tenantLimit: preset.tenantLimit,
            smsEnabled: preset.smsEnabled,
            customBranding: preset.customBranding,
            multiAdmin: preset.multiAdmin,
            isPopular: preset.isPopular ?? false,
            features: preset.features,
        }));
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

    if (payload.plan === SubscriptionPlan.FREE_TRIAL) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot switch back to free trial",
        );
    }

    const existing = await prisma.subscription.findUnique({
        where: { organizationId: user.organizationId },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }

    if (existing.plan === payload.plan && existing.status === SubscriptionStatus.ACTIVE) {
        throw new AppError(status.BAD_REQUEST, `Already on ${payload.plan} plan`);
    }

    // Limit downgrade check — don't allow downgrading if current usage exceeds the new plan's limits
    const targetPreset = PLAN_PRESETS[payload.plan];
    const [buildingCount, unitCount, tenantCount] = await Promise.all([
        prisma.building.count({ where: { organizationId: user.organizationId } }),
        prisma.unit.count({
            where: { building: { organizationId: user.organizationId } },
        }),
        prisma.tenant.count({ where: { organizationId: user.organizationId } }),
    ]);

    if (buildingCount > targetPreset.buildingLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot downgrade: you have ${buildingCount} buildings but the ${targetPreset.displayName} plan allows ${targetPreset.buildingLimit}`,
        );
    }
    if (unitCount > targetPreset.unitLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot downgrade: you have ${unitCount} units but the ${targetPreset.displayName} plan allows ${targetPreset.unitLimit}`,
        );
    }
    if (tenantCount > targetPreset.tenantLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot downgrade: you have ${tenantCount} tenants but the ${targetPreset.displayName} plan allows ${targetPreset.tenantLimit}`,
        );
    }

    return prisma.subscription.update({
        where: { organizationId: user.organizationId },
        data: buildSubscriptionData(payload.plan),
    });
};

const cancelSubscription = async (user: IRequestUser) => {
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

    if (existing.status === SubscriptionStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Subscription already cancelled");
    }

    return prisma.subscription.update({
        where: { organizationId: user.organizationId },
        data: {
            status: SubscriptionStatus.CANCELLED,
            autoRenew: false,
            endDate: new Date(),
        },
    });
};

const reactivateSubscription = async (user: IRequestUser) => {
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

    if (existing.status !== SubscriptionStatus.CANCELLED) {
        throw new AppError(
            status.BAD_REQUEST,
            "Only cancelled subscriptions can be reactivated",
        );
    }

    return prisma.subscription.update({
        where: { organizationId: user.organizationId },
        data: {
            status: SubscriptionStatus.ACTIVE,
            autoRenew: true,
            endDate: null,
        },
    });
};

const listAllSubscriptions = async (filters: {
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
}) => {
    return prisma.subscription.findMany({
        where: {
            ...(filters.status && { status: filters.status }),
            ...(filters.plan && { plan: filters.plan }),
        },
        include: {
            organization: {
                select: { id: true, name: true, slug: true, email: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

const adminUpdateSubscription = async (
    organizationId: string,
    payload: {
        plan?: SubscriptionPlan;
        status?: SubscriptionStatus;
        endDate?: Date | null;
        autoRenew?: boolean;
    },
) => {
    const existing = await prisma.subscription.findUnique({
        where: { organizationId },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }

    const data: Prisma.SubscriptionUpdateInput = {};

    if (payload.plan) {
        Object.assign(data, buildSubscriptionData(payload.plan));
    }
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.endDate !== undefined) data.endDate = payload.endDate;
    if (payload.autoRenew !== undefined) data.autoRenew = payload.autoRenew;

    return prisma.subscription.update({
        where: { organizationId },
        data,
    });
};

export const SubscriptionService = {
    createTrialSubscriptionForOrg,
    getAllPlans,
    getMySubscription,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    listAllSubscriptions,
    adminUpdateSubscription,
};
