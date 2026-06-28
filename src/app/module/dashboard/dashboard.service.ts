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

// One rich payload powering the entire owner dashboard home page so the UI
// needs a single request. Every money value is returned as a plain number
// (the dashboard does numeric math/formatting on the client).
const getOverview = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const toNum = (d: Prisma.Decimal | null | undefined) => Number(d ?? 0);
    const ym = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
    );
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
    );
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const owedStatuses = [
        PaymentStatus.DUE,
        PaymentStatus.PARTIAL,
        PaymentStatus.OVERDUE,
    ];

    const [
        buildingsTotal,
        buildingsNewThisQuarter,
        unitStatusGroups,
        unitsNewThisMonth,
        rentRollAgg,
        paymentsTrend,
        openInvoices,
        recentLeasesRaw,
    ] = await Promise.all([
        prisma.building.count({ where: { organizationId } }),
        prisma.building.count({
            where: { organizationId, createdAt: { gte: quarterStart } },
        }),
        prisma.unit.groupBy({
            by: ["status"],
            where: { building: { organizationId } },
            _count: { status: true },
        }),
        prisma.unit.count({
            where: {
                building: { organizationId },
                createdAt: { gte: monthStart },
            },
        }),
        // Expected monthly income from active leases — a stable "target" that
        // doesn't depend on which billing months happen to have invoices.
        prisma.lease.aggregate({
            where: { organizationId, status: LeaseStatus.ACTIVE },
            _sum: { monthlyRent: true, serviceCharge: true },
        }),
        // Real cash received across the trend window — powers both the monthly
        // trend and the current/last-month KPI.
        prisma.payment.findMany({
            where: {
                organizationId,
                paidAt: { gte: trendStart, lte: monthEnd },
            },
            select: { amount: true, tenantId: true, paidAt: true },
        }),
        prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: owedStatuses },
                dueAmount: { gt: 0 },
            },
            select: {
                id: true,
                invoiceNumber: true,
                dueAmount: true,
                dueDate: true,
                tenantId: true,
                tenant: { select: { name: true } },
                unit: {
                    select: {
                        name: true,
                        building: { select: { name: true } },
                    },
                },
            },
            orderBy: { dueDate: "asc" },
        }),
        prisma.lease.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                monthlyRent: true,
                status: true,
                tenant: { select: { name: true } },
                unit: {
                    select: {
                        name: true,
                        building: { select: { name: true } },
                    },
                },
            },
        }),
    ]);

    // ── Units / occupancy ──────────────────────────────────────────
    const unitCount = (s: UnitStatus) =>
        unitStatusGroups.find((g) => g.status === s)?._count.status ?? 0;
    const occupied = unitCount(UnitStatus.OCCUPIED);
    const vacant = unitCount(UnitStatus.VACANT);
    const underMaintenance = unitCount(UnitStatus.UNDER_MAINTENANCE);
    const totalUnits = unitStatusGroups.reduce(
        (s, g) => s + g._count.status,
        0,
    );
    const occupancyRate =
        totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;

    // ── Monthly target (active-lease rent roll) ────────────────────
    const target =
        toNum(rentRollAgg._sum.monthlyRent) +
        toNum(rentRollAgg._sum.serviceCharge);

    // ── Cash collected, bucketed by month ──────────────────────────
    const cashByMonth = new Map<
        string,
        { amount: number; tenants: Set<string> }
    >();
    for (const p of paymentsTrend) {
        const key = ym(p.paidAt);
        const bucket =
            cashByMonth.get(key) ?? { amount: 0, tenants: new Set<string>() };
        bucket.amount += toNum(p.amount);
        bucket.tenants.add(p.tenantId);
        cashByMonth.set(key, bucket);
    }

    const collectionTrend = Array.from({ length: 12 }, (_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
        return {
            month: ym(d),
            label: d.toLocaleString("en-US", { month: "short" }),
            collected: cashByMonth.get(ym(d))?.amount ?? 0,
            target,
            current: idx === 11,
        };
    });

    // ── Current-month collection KPI ───────────────────────────────
    const collected = cashByMonth.get(ym(now))?.amount ?? 0;
    const lastCollected = cashByMonth.get(ym(lastMonthStart))?.amount ?? 0;
    const deltaVsLastMonth = collected - lastCollected;
    const deltaPct =
        lastCollected > 0
            ? (deltaVsLastMonth / lastCollected) * 100
            : collected > 0
              ? 100
              : 0;
    const rate = target > 0 ? (collected / target) * 100 : 0;
    const daysLeftInMonth = Math.max(0, monthEnd.getDate() - now.getDate());

    // ── Collection pulse buckets ───────────────────────────────────
    // Overdue = past the due date; Outstanding = every unpaid balance.
    let overdueAmount = 0;
    let outstandingAmount = 0;
    const overdueTenants = new Set<string>();
    const outstandingTenants = new Set<string>();
    for (const inv of openInvoices) {
        const amt = toNum(inv.dueAmount);
        outstandingAmount += amt;
        outstandingTenants.add(inv.tenantId);
        if (inv.dueDate < now) {
            overdueAmount += amt;
            overdueTenants.add(inv.tenantId);
        }
    }
    const thisMonthCash = cashByMonth.get(ym(now));
    const paidThisMonthAmount = thisMonthCash?.amount ?? 0;
    const paidThisMonthTenants = thisMonthCash?.tenants.size ?? 0;

    // ── Upcoming & overdue invoices (soonest first) ────────────────
    const dayMs = 86_400_000;
    const upcomingDues = openInvoices.slice(0, 6).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        tenantName: inv.tenant.name,
        unitLabel: `${inv.unit.building.name} · ${inv.unit.name}`,
        amount: toNum(inv.dueAmount),
        dueInDays: Math.ceil((inv.dueDate.getTime() - now.getTime()) / dayMs),
        overdue: inv.dueDate < now,
    }));

    const recentLeases = recentLeasesRaw.map((l) => ({
        id: l.id,
        tenantName: l.tenant.name,
        unitName: l.unit.name,
        buildingName: l.unit.building.name,
        monthlyRent: toNum(l.monthlyRent),
        status: l.status,
    }));

    return {
        collection: {
            month: ym(now),
            monthLabel: now.toLocaleString("en-US", {
                month: "long",
                year: "numeric",
            }),
            collected,
            target,
            outstanding: outstandingAmount,
            rate,
            deltaVsLastMonth,
            deltaPct,
            daysLeftInMonth,
        },
        pulse: {
            overdue: { tenants: overdueTenants.size, amount: overdueAmount },
            outstanding: {
                tenants: outstandingTenants.size,
                amount: outstandingAmount,
            },
            paidThisMonth: {
                tenants: paidThisMonthTenants,
                amount: paidThisMonthAmount,
            },
        },
        stats: {
            buildings: buildingsTotal,
            buildingsNewThisQuarter,
            totalUnits,
            unitsNewThisMonth,
            occupancyRate,
            occupied,
            vacant,
            underMaintenance,
        },
        occupancy: { occupied, vacant, underMaintenance, total: totalUnits },
        collectionTrend,
        recentLeases,
        upcomingDues,
    };
};

export const DashboardService = { getSummary, getOccupancy, getOverview };
