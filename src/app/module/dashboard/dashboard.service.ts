import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { LeaseStatus, PaymentStatus, UnitStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const getSummary = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
        totalBuildings,
        unitCounts,
        activeTenants,
        activeLeases,
        monthlyRevenue,
        dueInvoices,
        overdueInvoices,
        recentComplaints,
    ] = await Promise.all([
        prisma.building.count({ where: { organizationId } }),

        prisma.unit.groupBy({
            by: ["status"],
            where: { building: { organizationId } },
            _count: { status: true },
        }),

        prisma.tenant.count({ where: { organizationId, isActive: true } }),

        prisma.lease.count({ where: { organizationId, status: LeaseStatus.ACTIVE } }),

        prisma.payment.aggregate({
            where: {
                organizationId,
                paidAt: { gte: monthStart, lte: monthEnd },
            },
            _sum: { amount: true },
        }),

        prisma.invoice.aggregate({
            where: { organizationId, status: PaymentStatus.DUE },
            _count: { id: true },
            _sum: { dueAmount: true },
        }),

        prisma.invoice.aggregate({
            where: { organizationId, status: PaymentStatus.OVERDUE },
            _count: { id: true },
            _sum: { dueAmount: true },
        }),

        prisma.complaint.count({
            where: { organizationId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] as never[] } },
        }),
    ]);

    const unitBreakdown = {
        total: unitCounts.reduce((sum, u) => sum + u._count.status, 0),
        occupied: unitCounts.find((u) => u.status === UnitStatus.OCCUPIED)?._count.status ?? 0,
        vacant: unitCounts.find((u) => u.status === UnitStatus.VACANT)?._count.status ?? 0,
        underMaintenance: unitCounts.find((u) => u.status === UnitStatus.UNDER_MAINTENANCE)?._count.status ?? 0,
    };

    return {
        buildings: totalBuildings,
        units: unitBreakdown,
        activeTenants,
        activeLeases,
        currentMonth: {
            revenue: monthlyRevenue._sum.amount ?? new Prisma.Decimal(0),
        },
        dueInvoices: {
            count: dueInvoices._count.id,
            totalDue: dueInvoices._sum.dueAmount ?? new Prisma.Decimal(0),
        },
        overdueInvoices: {
            count: overdueInvoices._count.id,
            totalDue: overdueInvoices._sum.dueAmount ?? new Prisma.Decimal(0),
        },
        openComplaints: recentComplaints,
    };
};

const getOccupancy = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const buildings = await prisma.building.findMany({
        where: { organizationId },
        select: {
            id: true,
            name: true,
            units: {
                select: { id: true, status: true },
            },
        },
    });

    return buildings.map((b) => {
        const total = b.units.length;
        const occupied = b.units.filter((u) => u.status === UnitStatus.OCCUPIED).length;
        const vacant = b.units.filter((u) => u.status === UnitStatus.VACANT).length;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        return {
            buildingId: b.id,
            buildingName: b.name,
            totalUnits: total,
            occupied,
            vacant,
            occupancyRate,
        };
    });
};

export const DashboardService = { getSummary, getOccupancy };
