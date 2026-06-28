import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { SubscriptionPlan } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdatePlanConfigPayload } from "./planConfig.interface";

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

export const PlanConfigService = {
    getAllPlanConfigs,
    getPlanConfigById,
    getPlanConfigByPlan,
    updatePlanConfig,
};
