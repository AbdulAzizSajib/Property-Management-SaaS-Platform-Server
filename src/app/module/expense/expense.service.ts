import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateExpensePayload,
    IExpenseQuery,
    IUpdateExpensePayload,
} from "./expense.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const createExpense = async (
    user: IRequestUser,
    payload: ICreateExpensePayload,
) => {
    const organizationId = assertOrg(user);

    if (payload.buildingId) {
        const building = await prisma.building.findFirst({
            where: { id: payload.buildingId, organizationId },
        });
        if (!building) {
            throw new AppError(status.NOT_FOUND, "Building not found");
        }
    }

    if (payload.unitId) {
        const unit = await prisma.unit.findFirst({
            where: { id: payload.unitId, building: { organizationId } },
        });
        if (!unit) {
            throw new AppError(status.NOT_FOUND, "Unit not found");
        }
    }

    return prisma.expense.create({
        data: {
            title: payload.title,
            category: payload.category,
            amount: new Prisma.Decimal(payload.amount),
            expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
            paidTo: payload.paidTo,
            paymentMethod: payload.paymentMethod,
            receiptUrl: payload.receiptUrl,
            notes: payload.notes,
            organizationId,
            buildingId: payload.buildingId,
            unitId: payload.unitId,
        },
        include: {
            building: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
        },
    });
};

const getAllExpenses = async (user: IRequestUser, query: IExpenseQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.ExpenseWhereInput = { organizationId };
    if (query.buildingId) where.buildingId = query.buildingId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.category) where.category = query.category as never;
    if (query.from || query.to) {
        where.expenseDate = {};
        if (query.from) where.expenseDate.gte = new Date(query.from);
        if (query.to) where.expenseDate.lte = new Date(query.to);
    }

    return prisma.expense.findMany({
        where,
        include: {
            building: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: "desc" },
    });
};

const getExpenseById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const expense = await prisma.expense.findFirst({
        where: { id, organizationId },
        include: {
            building: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
        },
    });

    if (!expense) {
        throw new AppError(status.NOT_FOUND, "Expense not found");
    }

    return expense;
};

const updateExpense = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateExpensePayload,
) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.expense.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Expense not found");
    }

    return prisma.expense.update({
        where: { id },
        data: {
            ...payload,
            amount: payload.amount !== undefined ? new Prisma.Decimal(payload.amount) : undefined,
            expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : undefined,
        },
    });
};

const deleteExpense = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.expense.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Expense not found");
    }

    return prisma.expense.delete({ where: { id } });
};

export const ExpenseService = {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
};
