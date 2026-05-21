import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ComplaintService } from "./complaint.service";

const createComplaint = catchAsync(async (req: Request, res: Response) => {
    const result = await ComplaintService.createComplaint(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Complaint created successfully",
        data: result,
    });
});

const getAllComplaints = catchAsync(async (req: Request, res: Response) => {
    const result = await ComplaintService.getAllComplaints(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Complaints fetched successfully",
        data: result,
    });
});

const getComplaintById = catchAsync(async (req: Request, res: Response) => {
    const result = await ComplaintService.getComplaintById(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Complaint fetched successfully",
        data: result,
    });
});

const updateComplaint = catchAsync(async (req: Request, res: Response) => {
    const result = await ComplaintService.updateComplaint(req.user, req.params.id as string, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Complaint updated successfully",
        data: result,
    });
});

const assignComplaint = catchAsync(async (req: Request, res: Response) => {
    const result = await ComplaintService.assignComplaint(req.user, req.params.id as string, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Complaint assigned successfully",
        data: result,
    });
});

const deleteComplaint = catchAsync(async (req: Request, res: Response) => {
    await ComplaintService.deleteComplaint(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Complaint deleted successfully",
        data: null,
    });
});

export const ComplaintController = {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    updateComplaint,
    assignComplaint,
    deleteComplaint,
};
