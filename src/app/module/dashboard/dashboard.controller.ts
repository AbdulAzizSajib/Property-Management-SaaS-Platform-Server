import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const getSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await DashboardService.getSummary(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Dashboard summary fetched successfully",
        data: result,
    });
});

const getOccupancy = catchAsync(async (req: Request, res: Response) => {
    const result = await DashboardService.getOccupancy(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Occupancy data fetched successfully",
        data: result,
    });
});

export const DashboardController = { getSummary, getOccupancy };
