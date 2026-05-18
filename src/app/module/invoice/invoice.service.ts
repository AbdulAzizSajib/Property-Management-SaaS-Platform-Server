import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
    InvoiceType,
    LeaseStatus,
    PaymentStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    IGenerateInvoicePayload,
    IGenerateMonthlyPayload,
    IInvoiceQuery,
} from "./invoice.interface";

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

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const generateOne = async (
    user: IRequestUser,
    payload: IGenerateInvoicePayload,
) => {
    const organizationId = assertOrg(user);

    const lease = await prisma.lease.findFirst({
        where: {
            id: payload.leaseId,
            organizationId,
            status: LeaseStatus.ACTIVE,
        },
    });
    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Active lease not found");
    }

    const billingMonth = monthStart(new Date(payload.billingMonth));

    const duplicate = await prisma.invoice.findFirst({
        where: {
            leaseId: lease.id,
            billingMonth,
            type: InvoiceType.RENT,
        },
    });
    if (duplicate) {
        throw new AppError(
            status.CONFLICT,
            "Invoice for this billing month already exists for this lease",
        );
    }

    const rent = new Prisma.Decimal(lease.monthlyRent);
    const serviceCharge = new Prisma.Decimal(lease.serviceCharge);
    const utility = new Prisma.Decimal(payload.utilityAmount ?? 0);
    const penalty = new Prisma.Decimal(payload.penaltyAmount ?? 0);
    const total = rent.add(serviceCharge).add(utility).add(penalty);

    const dueDate = payload.dueDate
        ? new Date(payload.dueDate)
        : new Date(
              billingMonth.getFullYear(),
              billingMonth.getMonth(),
              lease.rentDueDay,
          );

    return prisma.invoice.create({
        data: {
            invoiceNumber: generateInvoiceNumber(organizationId),
            type: InvoiceType.RENT,
            status: PaymentStatus.DUE,
            billingMonth,
            dueDate,
            rentAmount: rent,
            serviceCharge,
            utilityAmount: utility,
            penaltyAmount: penalty,
            totalAmount: total,
            dueAmount: total,
            notes: payload.notes,
            organizationId,
            leaseId: lease.id,
            unitId: lease.unitId,
            tenantId: lease.tenantId,
        },
    });
};

const generateMonthlyBatch = async (
    user: IRequestUser,
    payload: IGenerateMonthlyPayload,
) => {
    const organizationId = assertOrg(user);
    const billingMonth = monthStart(new Date(payload.billingMonth));

    const activeLeases = await prisma.lease.findMany({
        where: { organizationId, status: LeaseStatus.ACTIVE },
    });

    const created: string[] = [];
    const skipped: string[] = [];

    for (const lease of activeLeases) {
        const exists = await prisma.invoice.findFirst({
            where: {
                leaseId: lease.id,
                billingMonth,
                type: InvoiceType.RENT,
            },
        });
        if (exists) {
            skipped.push(lease.id);
            continue;
        }

        const rent = new Prisma.Decimal(lease.monthlyRent);
        const sc = new Prisma.Decimal(lease.serviceCharge);
        const total = rent.add(sc);
        const dueDate = new Date(
            billingMonth.getFullYear(),
            billingMonth.getMonth(),
            lease.rentDueDay,
        );

        const inv = await prisma.invoice.create({
            data: {
                invoiceNumber: generateInvoiceNumber(organizationId),
                type: InvoiceType.RENT,
                status: PaymentStatus.DUE,
                billingMonth,
                dueDate,
                rentAmount: rent,
                serviceCharge: sc,
                totalAmount: total,
                dueAmount: total,
                organizationId,
                leaseId: lease.id,
                unitId: lease.unitId,
                tenantId: lease.tenantId,
            },
        });
        created.push(inv.id);
    }

    return { createdCount: created.length, skippedCount: skipped.length };
};

const getAllInvoices = async (user: IRequestUser, query: IInvoiceQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.InvoiceWhereInput = { organizationId };
    if (query.leaseId) where.leaseId = query.leaseId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.status) where.status = query.status;

    return prisma.invoice.findMany({
        where,
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
        orderBy: [{ billingMonth: "desc" }, { createdAt: "desc" }],
    });
};

const getInvoiceById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
        include: {
            tenant: true,
            unit: { include: { building: true } },
            lease: true,
            payments: { orderBy: { paidAt: "desc" } },
        },
    });

    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    return invoice;
};

export const InvoiceService = {
    generateOne,
    generateMonthlyBatch,
    getAllInvoices,
    getInvoiceById,
};
