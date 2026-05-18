import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { BuildingService } from "./building.service";

const createBuilding = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.createBuilding(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Building created successfully",
        data: result,
    });
});

const getAllBuildings = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.getAllBuildings(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Buildings fetched successfully",
        data: result,
    });
});

const getBuildingById = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.getBuildingById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Building fetched successfully",
        data: result,
    });
});

const updateBuilding = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.updateBuilding(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Building updated successfully",
        data: result,
    });
});

const deleteBuilding = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.deleteBuilding(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Building deleted successfully",
        data: result,
    });
});

const assignCaretaker = catchAsync(async (req: Request, res: Response) => {
    const result = await BuildingService.assignCaretaker(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Caretaker assigned successfully",
        data: result,
    });
});

export const BuildingController = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
    updateBuilding,
    deleteBuilding,
    assignCaretaker,
};
