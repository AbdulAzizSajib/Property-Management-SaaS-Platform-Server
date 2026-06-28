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

const getPlanConfig = async (
    plan: SubscriptionPlan,
    client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
    const config = await client.planConfig.findUnique({ where: { plan } });
    if (!config) {
        throw new AppError(
            status.NOT_FOUND,
            `Plan configuration for ${plan} not found. Run seed to initialize.`,
        );
    }
    if (!config.isActive) {
        throw new AppError(
            status.BAD_REQUEST,
            `Plan ${plan} is currently disabled`,
        );
    }
    return config;
};

const buildSubscriptionData = async (
    plan: SubscriptionPlan,
    client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
    const preset = await getPlanConfig(plan, client);
    const now = new Date();
    const isFreePlan = plan === SubscriptionPlan.FREE;
    const hasTrial = !isFreePlan && Boolean(preset.trialDays);

    return {
        plan,
        status: hasTrial
            ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE,
        buildingLimit: preset.buildingLimit,
        floorLimit: preset.floorLimit,
        unitLimit: preset.unitLimit,
        tenantLimit: preset.tenantLimit,
        smsEnabled: preset.smsEnabled,
        customBranding: preset.customBranding,
        multiAdmin: preset.multiAdmin,
        priceMonthly: preset.priceMonthly,
        trialEndsAt:
            hasTrial && preset.trialDays
                ? new Date(now.getTime() + preset.trialDays * 24 * 60 * 60 * 1000)
                : null,
        startDate: now,
        endDate: null,
        autoRenew: !isFreePlan,
    };
};

const createDefaultSubscriptionForOrg = async (
    organizationId: string,
    tx: Prisma.TransactionClient,
) => {
    const data = await buildSubscriptionData(SubscriptionPlan.FREE, tx);
    return tx.subscription.create({
        data: {
            ...data,
            organizationId,
        },
    });
};

const getAllPlans = async () => {
    const configs = await prisma.planConfig.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: "asc" },
    });

    return configs.map((preset) => ({
        plan: preset.plan,
        displayName: preset.displayName,
        description: preset.description,
        priceMonthly: preset.priceMonthly,
        buildingLimit: preset.buildingLimit,
        floorLimit: preset.floorLimit,
        unitLimit: preset.unitLimit,
        tenantLimit: preset.tenantLimit,
        smsEnabled: preset.smsEnabled,
        customBranding: preset.customBranding,
        multiAdmin: preset.multiAdmin,
        isPopular: preset.isPopular,
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

    // Current usage against the plan limits — lets the UI show "used / limit"
    // (sidebar footer, subscription page) without a second request.
    const orgId = user.organizationId;
    const [planConfig, buildings, floors, units, tenants] = await Promise.all([
        prisma.planConfig.findUnique({ where: { plan: subscription.plan } }),
        prisma.building.count({ where: { organizationId: orgId } }),
        prisma.floor.count({ where: { building: { organizationId: orgId } } }),
        prisma.unit.count({ where: { building: { organizationId: orgId } } }),
        prisma.tenant.count({ where: { organizationId: orgId } }),
    ]);

    return {
        ...subscription,
        planName: planConfig?.displayName ?? subscription.plan,
        usage: { buildings, floors, units, tenants },
    };
};

// Apply a plan change to an organization after enforcing that current usage
// fits within the target plan's limits. Shared by the FREE-downgrade path and
// the admin approval of a paid payment request.
const applyPlanChange = async (
    organizationId: string,
    plan: SubscriptionPlan,
) => {
    const existing = await prisma.subscription.findUnique({
        where: { organizationId },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }

    const targetPreset = await getPlanConfig(plan);
    const [buildingCount, floorCount, unitCount, tenantCount] =
        await Promise.all([
            prisma.building.count({ where: { organizationId } }),
            prisma.floor.count({
                where: { building: { organizationId } },
            }),
            prisma.unit.count({ where: { building: { organizationId } } }),
            prisma.tenant.count({ where: { organizationId } }),
        ]);

    if (buildingCount > targetPreset.buildingLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot switch: ${buildingCount} buildings exceed the ${targetPreset.displayName} plan limit of ${targetPreset.buildingLimit}`,
        );
    }
    if (floorCount > targetPreset.floorLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot switch: ${floorCount} floors exceed the ${targetPreset.displayName} plan limit of ${targetPreset.floorLimit}`,
        );
    }
    if (unitCount > targetPreset.unitLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot switch: ${unitCount} units exceed the ${targetPreset.displayName} plan limit of ${targetPreset.unitLimit}`,
        );
    }
    if (tenantCount > targetPreset.tenantLimit) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot switch: ${tenantCount} tenants exceed the ${targetPreset.displayName} plan limit of ${targetPreset.tenantLimit}`,
        );
    }

    const data = await buildSubscriptionData(plan);
    return prisma.subscription.update({
        where: { organizationId },
        data,
    });
};

// Owners can only switch DOWN to the free plan directly. Activating a paid plan
// requires a verified payment, handled by the subscription-request flow.
const changePlan = async (user: IRequestUser, payload: IChangePlanPayload) => {
    if (!user.organizationId) {
        throw new AppError(
            status.BAD_REQUEST,
            "User is not associated with any organization",
        );
    }

    if (payload.plan !== SubscriptionPlan.FREE) {
        throw new AppError(
            status.BAD_REQUEST,
            "Paid plans require a verified payment. Submit a payment request from the subscription page.",
        );
    }

    const existing = await prisma.subscription.findUnique({
        where: { organizationId: user.organizationId },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }
    if (
        existing.plan === SubscriptionPlan.FREE &&
        existing.status === SubscriptionStatus.ACTIVE
    ) {
        throw new AppError(status.BAD_REQUEST, "Already on the Free plan");
    }

    return applyPlanChange(user.organizationId, SubscriptionPlan.FREE);
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
        Object.assign(data, await buildSubscriptionData(payload.plan));
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
    createDefaultSubscriptionForOrg,
    getAllPlans,
    getMySubscription,
    changePlan,
    applyPlanChange,
    getPlanConfig,
    cancelSubscription,
    reactivateSubscription,
    listAllSubscriptions,
    adminUpdateSubscription,
};
