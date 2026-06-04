import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { InvoiceService } from "./invoice.service";

const generateOne = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.generateOne(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Invoice generated successfully",
        data: result,
    });
});

const generateMonthlyBatch = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.generateMonthlyBatch(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: `Generated ${result.createdCount} invoices, skipped ${result.skippedCount}`,
        data: result,
    });
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.getAllInvoices(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invoices fetched successfully",
        data: result,
    });
});

const getInvoiceById = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.getInvoiceById(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invoice fetched successfully",
        data: result,
    });
});

const updateInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.updateInvoice(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invoice updated successfully",
        data: result,
    });
});

const cancelInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.cancelInvoice(
        req.user,
        req.params.id as string,
        req.body,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invoice cancelled successfully",
        data: result,
    });
});

const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.deleteInvoice(
        req.user,
        req.params.id as string,
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invoice deleted permanently",
        data: result,
    });
});

export const InvoiceController = {
    generateOne,
    generateMonthlyBatch,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
};
