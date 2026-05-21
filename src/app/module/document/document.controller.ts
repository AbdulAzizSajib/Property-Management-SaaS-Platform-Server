import { Request, Response } from "express";
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DocumentService } from "./document.service";

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new AppError(status.BAD_REQUEST, "No file uploaded");
    }

    const fileUrl = (req.file as Express.Multer.File & { path: string }).path;

    const result = await DocumentService.uploadDocument(req.user, {
        name: req.body.name || req.file.originalname,
        type: req.body.type,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        tenantId: req.body.tenantId,
        buildingId: req.body.buildingId,
        leaseId: req.body.leaseId,
    });

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Document uploaded successfully",
        data: result,
    });
});

const getAllDocuments = catchAsync(async (req: Request, res: Response) => {
    const result = await DocumentService.getAllDocuments(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Documents fetched successfully",
        data: result,
    });
});

const getDocumentById = catchAsync(async (req: Request, res: Response) => {
    const result = await DocumentService.getDocumentById(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Document fetched successfully",
        data: result,
    });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
    await DocumentService.deleteDocument(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Document deleted successfully",
        data: null,
    });
});

export const DocumentController = {
    uploadDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
};
