import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { LeaseService } from "./lease.service";

const createLease = catchAsync(async (req: Request, res: Response) => {
    const result = await LeaseService.createLease(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Lease created (unit marked OCCUPIED, first invoice generated)",
        data: result,
    });
});

const getAllLeases = catchAsync(async (req: Request, res: Response) => {
    const result = await LeaseService.getAllLeases(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Leases fetched successfully",
        data: result,
    });
});

const getLeaseById = catchAsync(async (req: Request, res: Response) => {
    const result = await LeaseService.getLeaseById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Lease fetched successfully",
        data: result,
    });
});

const terminateLease = catchAsync(async (req: Request, res: Response) => {
    const result = await LeaseService.terminateLease(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Lease terminated (unit marked VACANT)",
        data: result,
    });
});

export const LeaseController = {
    createLease,
    getAllLeases,
    getLeaseById,
    terminateLease,
};
