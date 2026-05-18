import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { OrganizationService } from "./organization.service";

const getMyOrganization = catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizationService.getMyOrganization(req.user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Organization fetched successfully",
        data: result,
    });
});

const updateMyOrganization = catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizationService.updateMyOrganization(
        req.user,
        req.body,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Organization updated successfully",
        data: result,
    });
});

export const OrganizationController = {
    getMyOrganization,
    updateMyOrganization,
};
