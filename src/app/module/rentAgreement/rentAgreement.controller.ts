import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { RentAgreementService } from "./rentAgreement.service";

const getAgreementByLease = catchAsync(async (req: Request, res: Response) => {
    const result = await RentAgreementService.getAgreementByLease(req.user, req.params.leaseId as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Rent agreement fetched successfully",
        data: result,
    });
});

const createAgreement = catchAsync(async (req: Request, res: Response) => {
    const result = await RentAgreementService.createAgreement(req.user, req.params.leaseId as string, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Rent agreement created successfully",
        data: result,
    });
});

const signAgreement = catchAsync(async (req: Request, res: Response) => {
    const result = await RentAgreementService.signAgreement(req.user, req.params.leaseId as string, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Agreement signed successfully",
        data: result,
    });
});

export const RentAgreementController = {
    getAgreementByLease,
    createAgreement,
    signAgreement,
};
