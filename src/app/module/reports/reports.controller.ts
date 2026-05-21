import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReportsService } from "./reports.service";

const getFinancialReport = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportsService.getFinancialReport(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Financial report fetched successfully",
        data: result,
    });
});

const getRentCollectionReport = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportsService.getRentCollectionReport(req.user, req.query as never);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Rent collection report fetched successfully",
        data: result,
    });
});

const getOccupancyReport = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportsService.getOccupancyReport(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Occupancy report fetched successfully",
        data: result,
    });
});

const getExpenseReport = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportsService.getExpenseReport(req.user, req.query as never);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense report fetched successfully",
        data: result,
    });
});

export const ReportsController = {
    getFinancialReport,
    getRentCollectionReport,
    getOccupancyReport,
    getExpenseReport,
};
