import { Request, Response } from "express";
import status from "http-status";
import { SubscriptionPlan } from "../../../generated/prisma/enums";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PlanConfigService } from "./planConfig.service";

const createPlanConfig = catchAsync(async (req: Request, res: Response) => {
    const result = await PlanConfigService.createPlanConfig(req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Plan config created successfully",
        data: result,
    });
});

const getAllPlanConfigs = catchAsync(async (_req: Request, res: Response) => {
    const result = await PlanConfigService.getAllPlanConfigs();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plan configs fetched successfully",
        data: result,
    });
});

const getPlanConfigById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PlanConfigService.getPlanConfigById(id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plan config fetched successfully",
        data: result,
    });
});

const getPlanConfigByPlan = catchAsync(async (req: Request, res: Response) => {
    const { plan } = req.params;
    const result = await PlanConfigService.getPlanConfigByPlan(
        plan as SubscriptionPlan,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plan config fetched successfully",
        data: result,
    });
});

const updatePlanConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PlanConfigService.updatePlanConfig(
        id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plan config updated successfully",
        data: result,
    });
});

const deletePlanConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PlanConfigService.deletePlanConfig(id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plan config deleted successfully",
        data: result,
    });
});

export const PlanConfigController = {
    createPlanConfig,
    getAllPlanConfigs,
    getPlanConfigById,
    getPlanConfigByPlan,
    updatePlanConfig,
    deletePlanConfig,
};
