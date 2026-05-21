import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { RentIncreaseService } from "./rentIncrease.service";

const createRentIncrease = catchAsync(async (req: Request, res: Response) => {
    const result = await RentIncreaseService.createRentIncrease(
        req.user,
        req.params.leaseId as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Rent increase recorded and lease updated successfully",
        data: result,
    });
});

const getRentIncreasesByLease = catchAsync(async (req: Request, res: Response) => {
    const result = await RentIncreaseService.getRentIncreasesByLease(
        req.user,
        req.params.leaseId as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Rent increases fetched successfully",
        data: result,
    });
});

export const RentIncreaseController = {
    createRentIncrease,
    getRentIncreasesByLease,
};
