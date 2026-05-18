import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
    InvoiceType,
    LeaseStatus,
    PaymentStatus,
    UnitStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateLeasePayload,
    ITerminateLeasePayload,
} from "./lease.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const generateInvoiceNumber = (organizationId: string) => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${ymd}-${organizationId.slice(0, 4).toUpperCase()}-${rand}`;
};

const createLease = async (
    user: IRequestUser,
    payload: ICreateLeasePayload,
) => {
    const organizationId = assertOrg(user);

    const tenant = await prisma.tenant.findFirst({
        where: { id: payload.tenantId, organizationId },
    });
    if (!tenant) {
        throw new AppError(status.NOT_FOUND, "Tenant not found");
    }

    const unit = await prisma.unit.findFirst({
        where: { id: payload.unitId, building: { organizationId } },
    });
    if (!unit) {
        throw new AppError(status.NOT_FOUND, "Unit not found");
    }

    if (unit.status === UnitStatus.OCCUPIED) {
        throw new AppError(
            status.BAD_REQUEST,
            "Unit is already occupied. Choose another unit or terminate existing lease.",
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        const lease = await tx.lease.create({
            data: {
                organizationId,
                tenantId: payload.tenantId,
                unitId: payload.unitId,
                status: LeaseStatus.ACTIVE,
                startDate: new Date(payload.startDate),
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                moveInDate: new Date(payload.moveInDate),
                monthlyRent: new Prisma.Decimal(payload.monthlyRent),
                serviceCharge:
                    payload.serviceCharge !== undefined
                        ? new Prisma.Decimal(payload.serviceCharge)
                        : new Prisma.Decimal(0),
                securityDeposit:
                    payload.securityDeposit !== undefined
                        ? new Prisma.Decimal(payload.securityDeposit)
                        : new Prisma.Decimal(0),
                rentDueDay: payload.rentDueDay ?? 5,
                notes: payload.notes,
            },
        });

        await tx.unit.update({
            where: { id: payload.unitId },
            data: { status: UnitStatus.OCCUPIED },
        });

        // First month invoice
        const start = new Date(payload.startDate);
        const billingMonth = new Date(
            start.getFullYear(),
            start.getMonth(),
            1,
        );
        const dueDate = new Date(
            start.getFullYear(),
            start.getMonth(),
            payload.rentDueDay ?? 5,
        );

        const rentAmount = new Prisma.Decimal(payload.monthlyRent);
        const serviceCharge =
            payload.serviceCharge !== undefined
                ? new Prisma.Decimal(payload.serviceCharge)
                : new Prisma.Decimal(0);
        const total = rentAmount.add(serviceCharge);

        await tx.invoice.create({
            data: {
                invoiceNumber: generateInvoiceNumber(organizationId),
                type: InvoiceType.RENT,
                status: PaymentStatus.DUE,
                billingMonth,
                dueDate,
                rentAmount,
                serviceCharge,
                totalAmount: total,
                dueAmount: total,
                organizationId,
                leaseId: lease.id,
                unitId: payload.unitId,
                tenantId: payload.tenantId,
            },
        });

        return lease;
    });

    return result;
};

const getAllLeases = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    return prisma.lease.findMany({
        where: { organizationId },
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
        orderBy: { createdAt: "desc" },
    });
};

const getLeaseById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const lease = await prisma.lease.findFirst({
        where: { id, organizationId },
        include: {
            tenant: true,
            unit: { include: { building: true, floor: true } },
            invoices: { orderBy: { billingMonth: "desc" } },
            payments: { orderBy: { paidAt: "desc" } },
        },
    });

    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Lease not found");
    }

    return lease;
};

const terminateLease = async (
    user: IRequestUser,
    id: string,
    payload: ITerminateLeasePayload,
) => {
    const organizationId = assertOrg(user);

    const lease = await prisma.lease.findFirst({
        where: { id, organizationId },
    });
    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Lease not found");
    }
    if (lease.status === LeaseStatus.TERMINATED) {
        throw new AppError(status.BAD_REQUEST, "Lease already terminated");
    }

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.lease.update({
            where: { id },
            data: {
                status: LeaseStatus.TERMINATED,
                moveOutDate: new Date(payload.moveOutDate),
                notes: payload.notes ?? lease.notes,
            },
        });

        await tx.unit.update({
            where: { id: lease.unitId },
            data: { status: UnitStatus.VACANT },
        });

        return updated;
    });

    return result;
};

export const LeaseService = {
    createLease,
    getAllLeases,
    getLeaseById,
    terminateLease,
};
