import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UnitService } from "./unit.service";

const createUnit = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitService.createUnit(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Unit created successfully",
        data: result,
    });
});

const getAllUnits = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitService.getAllUnits(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Units fetched successfully",
        data: result,
    });
});

const getUnitById = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitService.getUnitById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Unit fetched successfully",
        data: result,
    });
});

const updateUnit = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitService.updateUnit(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Unit updated successfully",
        data: result,
    });
});

const deleteUnit = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitService.deleteUnit(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Unit deleted successfully",
        data: result,
    });
});

export const UnitController = {
    createUnit,
    getAllUnits,
    getUnitById,
    updateUnit,
    deleteUnit,
};
