import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { PaymentStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const parseDateRange = (from?: string, to?: string) => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return {
        gte: from ? new Date(from) : startOfYear,
        lte: to ? new Date(to) : now,
    };
};

const getFinancialReport = async (
    user: IRequestUser,
    query: { from?: string; to?: string },
) => {
    const organizationId = assertOrg(user);
    const dateRange = parseDateRange(query.from, query.to);

    const [payments, expenses] = await Promise.all([
        prisma.payment.findMany({
            where: { organizationId, paidAt: dateRange },
            select: { amount: true, paidAt: true },
        }),
        prisma.expense.findMany({
            where: { organizationId, expenseDate: dateRange },
            select: { amount: true, expenseDate: true, category: true },
        }),
    ]);

    const incomeByMonth: Record<string, Prisma.Decimal> = {};
    for (const p of payments) {
        const key = p.paidAt.toISOString().slice(0, 7);
        incomeByMonth[key] = (incomeByMonth[key] ?? new Prisma.Decimal(0)).add(p.amount);
    }

    const expenseByMonth: Record<string, Prisma.Decimal> = {};
    for (const e of expenses) {
        const key = e.expenseDate.toISOString().slice(0, 7);
        expenseByMonth[key] = (expenseByMonth[key] ?? new Prisma.Decimal(0)).add(e.amount);
    }

    const allMonths = [...new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])].sort();

    const monthly = allMonths.map((month) => {
        const income = incomeByMonth[month] ?? new Prisma.Decimal(0);
        const expense = expenseByMonth[month] ?? new Prisma.Decimal(0);
        return {
            month,
            income,
            expense,
            net: income.sub(expense),
        };
    });

    const totalIncome = Object.values(incomeByMonth).reduce((s, v) => s.add(v), new Prisma.Decimal(0));
    const totalExpense = Object.values(expenseByMonth).reduce((s, v) => s.add(v), new Prisma.Decimal(0));

    return {
        period: { from: dateRange.gte, to: dateRange.lte },
        summary: {
            totalIncome,
            totalExpense,
            netProfit: totalIncome.sub(totalExpense),
        },
        monthly,
    };
};

const getRentCollectionReport = async (
    user: IRequestUser,
    query: { from?: string; to?: string; buildingId?: string },
) => {
    const organizationId = assertOrg(user);
    const dateRange = parseDateRange(query.from, query.to);

    const invoices = await prisma.invoice.findMany({
        where: {
            organizationId,
            billingMonth: dateRange,
            ...(query.buildingId ? { unit: { buildingId: query.buildingId } } : {}),
        },
        include: {
            tenant: { select: { id: true, name: true, phone: true } },
            unit: {
                select: {
                    id: true,
                    name: true,
                    building: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { billingMonth: "desc" },
    });

    const byTenant: Record<string, {
        tenant: { id: string; name: string; phone: string };
        totalBilled: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        totalDue: Prisma.Decimal;
        invoiceCount: number;
        paidCount: number;
    }> = {};

    for (const inv of invoices) {
        const tid = inv.tenantId;
        if (!byTenant[tid]) {
            byTenant[tid] = {
                tenant: inv.tenant,
                totalBilled: new Prisma.Decimal(0),
                totalPaid: new Prisma.Decimal(0),
                totalDue: new Prisma.Decimal(0),
                invoiceCount: 0,
                paidCount: 0,
            };
        }
        byTenant[tid].totalBilled = byTenant[tid].totalBilled.add(inv.totalAmount);
        byTenant[tid].totalPaid = byTenant[tid].totalPaid.add(inv.paidAmount);
        byTenant[tid].totalDue = byTenant[tid].totalDue.add(inv.dueAmount);
        byTenant[tid].invoiceCount += 1;
        if (inv.status === PaymentStatus.PAID) byTenant[tid].paidCount += 1;
    }

    return {
        period: { from: dateRange.gte, to: dateRange.lte },
        tenants: Object.values(byTenant),
    };
};

const getOccupancyReport = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const buildings = await prisma.building.findMany({
        where: { organizationId },
        include: {
            units: { select: { id: true, name: true, status: true, type: true } },
        },
    });

    return buildings.map((b) => {
        const total = b.units.length;
        const occupied = b.units.filter((u) => u.status === "OCCUPIED").length;
        return {
            buildingId: b.id,
            buildingName: b.name,
            totalUnits: total,
            occupied,
            vacant: b.units.filter((u) => u.status === "VACANT").length,
            underMaintenance: b.units.filter((u) => u.status === "UNDER_MAINTENANCE").length,
            occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
            units: b.units,
        };
    });
};

const getExpenseReport = async (
    user: IRequestUser,
    query: { from?: string; to?: string; buildingId?: string },
) => {
    const organizationId = assertOrg(user);
    const dateRange = parseDateRange(query.from, query.to);

    const expenses = await prisma.expense.findMany({
        where: {
            organizationId,
            expenseDate: dateRange,
            ...(query.buildingId ? { buildingId: query.buildingId } : {}),
        },
        include: {
            building: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: "desc" },
    });

    const byCategory: Record<string, Prisma.Decimal> = {};
    for (const e of expenses) {
        const cat = e.category as string;
        byCategory[cat] = (byCategory[cat] ?? new Prisma.Decimal(0)).add(e.amount);
    }

    const totalExpense = Object.values(byCategory).reduce((s, v) => s.add(v), new Prisma.Decimal(0));

    const categoryBreakdown = Object.entries(byCategory)
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpense.isZero() ? 0 : Number(amount.div(totalExpense).mul(100).toFixed(2)),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount));

    return {
        period: { from: dateRange.gte, to: dateRange.lte },
        summary: { totalExpense, count: expenses.length },
        categoryBreakdown,
        expenses,
    };
};

export const ReportsService = {
    getFinancialReport,
    getRentCollectionReport,
    getOccupancyReport,
    getExpenseReport,
};
