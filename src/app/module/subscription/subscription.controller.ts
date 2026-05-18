import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SubscriptionService } from "./subscription.service";

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

export const SubscriptionController = {
    getMySubscription,
    changePlan,
};
