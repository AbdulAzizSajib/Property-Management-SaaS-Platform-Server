import { Request, Response } from "express";
import status from "http-status";
import { SubscriptionRequestStatus } from "../../../generated/prisma/enums";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SubscriptionRequestService } from "./subscriptionRequest.service";

const getPaymentInfo = catchAsync(async (_req: Request, res: Response) => {
    const result = await SubscriptionRequestService.getPaymentInfo();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment info fetched successfully",
        data: result,
    });
});

const createRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionRequestService.createRequest(
        req.user,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Payment request submitted. An admin will verify it shortly.",
        data: result,
    });
});

const getMyRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionRequestService.getMyRequests(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Requests fetched successfully",
        data: result,
    });
});

const listRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionRequestService.listRequests({
        status: req.query.status as SubscriptionRequestStatus | undefined,
    });
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Requests fetched successfully",
        data: result,
    });
});

const approveRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionRequestService.approveRequest(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Request approved and plan activated",
        data: result,
    });
});

const rejectRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionRequestService.rejectRequest(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Request rejected",
        data: result,
    });
});

export const SubscriptionRequestController = {
    getPaymentInfo,
    createRequest,
    getMyRequests,
    listRequests,
    approveRequest,
    rejectRequest,
};
