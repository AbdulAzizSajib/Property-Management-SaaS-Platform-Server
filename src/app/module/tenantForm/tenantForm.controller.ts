import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { TenantFormService } from "./tenantForm.service";

const createTenantForm = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantFormService.createTenantForm(
        req.user,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Tenant form created successfully",
        data: result,
    });
});

const getAllTenantForms = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantFormService.getAllTenantForms(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant forms fetched successfully",
        data: result,
    });
});

const getTenantFormById = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantFormService.getTenantFormById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant form fetched successfully",
        data: result,
    });
});

const updateTenantForm = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantFormService.updateTenantForm(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant form updated successfully",
        data: result,
    });
});

const deleteTenantForm = catchAsync(async (req: Request, res: Response) => {
    const result = await TenantFormService.deleteTenantForm(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Tenant form deleted successfully",
        data: result,
    });
});

export const TenantFormController = {
    createTenantForm,
    getAllTenantForms,
    getTenantFormById,
    updateTenantForm,
    deleteTenantForm,
};
