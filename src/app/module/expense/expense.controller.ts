import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ExpenseService } from "./expense.service";

const createExpense = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.createExpense(req.user, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Expense created successfully",
        data: result,
    });
});

const getAllExpenses = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.getAllExpenses(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expenses fetched successfully",
        data: result,
    });
});

const getExpenseById = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.getExpenseById(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense fetched successfully",
        data: result,
    });
});

const updateExpense = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.updateExpense(req.user, req.params.id as string, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense updated successfully",
        data: result,
    });
});

const deleteExpense = catchAsync(async (req: Request, res: Response) => {
    await ExpenseService.deleteExpense(req.user, req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense deleted successfully",
        data: null,
    });
});

export const ExpenseController = {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
};
