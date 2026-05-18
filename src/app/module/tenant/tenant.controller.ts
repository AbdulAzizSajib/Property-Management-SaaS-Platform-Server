import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { TenantService } from "./tenant.service";

const createTenant = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantService.createTenant(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Tenant created successfully",
        data: result,
    });
});

const getAllTenants = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantService.getAllTenants(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenants fetched successfully",
        data: result,
    });
});

const getTenantById = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantService.getTenantById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant fetched successfully",
        data: result,
    });
});

const updateTenant = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantService.updateTenant(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant updated successfully",
        data: result,
    });
});

const deleteTenant = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantService.deleteTenant(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant deactivated successfully",
        data: result,
    });
});

export const TenantController = {
    createTenant,
    getAllTenants,
    getTenantById,
    updateTenant,
    deleteTenant,
};
