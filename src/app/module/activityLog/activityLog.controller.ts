import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ActivityLogService } from "./activityLog.service";

const getActivityLogs = catchAsync(async (req: Request, res: Response) => {
    const result = await ActivityLogService.getActivityLogs(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Activity logs fetched successfully",
        data: result,
    });
});

export const ActivityLogController = { getActivityLogs };
