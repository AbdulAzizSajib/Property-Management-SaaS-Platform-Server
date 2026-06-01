import { Request, Response } from "express";
import status from "http-status";
import {
    SubscriptionPlan,
    SubscriptionStatus,
} from "../../../generated/prisma/enums";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SubscriptionService } from "./subscription.service";

const getAllPlans = catchAsync(async (_req: Request, res: Response) => {
    const result = await SubscriptionService.getAllPlans();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Plans fetched successfully",
        data: result,
    });
});

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.getMySubscription(req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Subscription fetched successfully",
        data: result,
    });
});

const changePlan = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.changePlan(req.user, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Subscription plan updated successfully",
        data: result,
    });
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.cancelSubscription(req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Subscription cancelled successfully",
        data: result,
    });
});

const reactivateSubscription = catchAsync(
    async (req: Request, res: Response) => {
        const result = await SubscriptionService.reactivateSubscription(req.user);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Subscription reactivated successfully",
            data: result,
        });
    },
);

const listAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.listAllSubscriptions({
        status: req.query.status as SubscriptionStatus | undefined,
        plan: req.query.plan as SubscriptionPlan | undefined,
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Subscriptions fetched successfully",
        data: result,
    });
});

const adminUpdateSubscription = catchAsync(
    async (req: Request, res: Response) => {
        const { organizationId } = req.params;
        const result = await SubscriptionService.adminUpdateSubscription(
            organizationId as string,
            req.body,
        );

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Subscription updated successfully",
            data: result,
        });
    },
);

export const SubscriptionController = {
    getAllPlans,
    getMySubscription,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    listAllSubscriptions,
    adminUpdateSubscription,
};
