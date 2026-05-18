import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { FloorService } from "./floor.service";

const createFloor = catchAsync(async (req: Request, res: Response) => {
    const result = await FloorService.createFloor(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Floor created successfully",
        data: result,
    });
});

const getFloorsByBuilding = catchAsync(async (req: Request, res: Response) => {
    const result = await FloorService.getFloorsByBuilding(
        req.user,
        req.query.buildingId as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Floors fetched successfully",
        data: result,
    });
});

const getFloorById = catchAsync(async (req: Request, res: Response) => {
    const result = await FloorService.getFloorById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Floor fetched successfully",
        data: result,
    });
});

const updateFloor = catchAsync(async (req: Request, res: Response) => {
    const result = await FloorService.updateFloor(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Floor updated successfully",
        data: result,
    });
});

const deleteFloor = catchAsync(async (req: Request, res: Response) => {
    const result = await FloorService.deleteFloor(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Floor deleted successfully",
        data: result,
    });
});

export const FloorController = {
    createFloor,
    getFloorsByBuilding,
    getFloorById,
    updateFloor,
    deleteFloor,
};
