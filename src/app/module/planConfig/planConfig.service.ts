import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { SubscriptionPlan } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreatePlanConfigPayload,
    IUpdatePlanConfigPayload,
} from "./planConfig.interface";

const createPlanConfig = async (payload: ICreatePlanConfigPayload) => {
    const existing = await prisma.planConfig.findUnique({
        where: { plan: payload.plan },
    });

    if (existing) {
        throw new AppError(
            status.CONFLICT,
            `Plan ${payload.plan} already exists. Use update instead.`,
        );
    }

    return prisma.planConfig.create({
        data: {
            ...payload,
            priceMonthly: new Prisma.Decimal(payload.priceMonthly),
        },
    });
};

const getAllPlanConfigs = async () => {
    return prisma.planConfig.findMany({
        orderBy: { priceMonthly: "asc" },
    });
};

const getPlanConfigById = async (id: string) => {
    const config = await prisma.planConfig.findUnique({ where: { id } });
    if (!config) {
        throw new AppError(status.NOT_FOUND, "Plan config not found");
    }
    return config;
};

const getPlanConfigByPlan = async (plan: SubscriptionPlan) => {
    const config = await prisma.planConfig.findUnique({ where: { plan } });
    if (!config) {
        throw new AppError(status.NOT_FOUND, `Plan ${plan} not configured`);
    }
    return config;
};

const updatePlanConfig = async (id: string, payload: IUpdatePlanConfigPayload) => {
    const existing = await prisma.planConfig.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Plan config not found");
    }

    const { priceMonthly, ...rest } = payload;
    const data: Prisma.PlanConfigUpdateInput = { ...rest };
    if (priceMonthly !== undefined) {
        data.priceMonthly = new Prisma.Decimal(priceMonthly);
    }

    return prisma.planConfig.update({ where: { id }, data });
};

const deletePlanConfig = async (id: string) => {
    const existing = await prisma.planConfig.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Plan config not found");
    }

    if (existing.plan === SubscriptionPlan.FREE) {
        throw new AppError(
            status.BAD_REQUEST,
            "FREE plan cannot be deleted; disable it via isActive instead",
        );
    }

    const subscribers = await prisma.subscription.count({
        where: { plan: existing.plan },
    });
    if (subscribers > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot delete plan ${existing.plan}: ${subscribers} active subscriptions reference it. Disable via isActive instead.`,
        );
    }

    return prisma.planConfig.delete({ where: { id } });
};

export const PlanConfigService = {
    createPlanConfig,
    getAllPlanConfigs,
    getPlanConfigById,
    getPlanConfigByPlan,
    updatePlanConfig,
    deletePlanConfig,
};
