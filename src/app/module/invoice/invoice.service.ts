import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
    BillingMode,
    InvoiceType,
    LeaseStatus,
    LineItemCategory,
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

type LeaseForInvoice = {
    id: string;
    organizationId: string;
    unitId: string;
    tenantId: string;
    monthlyRent: Prisma.Decimal;
    serviceCharge: Prisma.Decimal;
    rentDueDay: number;
    billingMode: BillingMode;
    gasCharge: Prisma.Decimal | null;
    waterCharge: Prisma.Decimal | null;
    electricityCharge: Prisma.Decimal | null;
    internetCharge: Prisma.Decimal | null;
};

type LineItemInput = {
    category: LineItemCategory;
    description: string;
    amount: Prisma.Decimal;
};

const buildUtilityLineItems = (
    lease: LeaseForInvoice,
    override?: {
        gas?: number;
        water?: number;
        electricity?: number;
        internet?: number;
    },
): LineItemInput[] => {
    if (lease.billingMode !== BillingMode.FIXED_SEPARATE) return [];

    const pick = (
        manual: number | undefined,
        fixed: Prisma.Decimal | null,
    ): Prisma.Decimal | null => {
        if (manual !== undefined) return new Prisma.Decimal(manual);
        return fixed;
    };

    const items: LineItemInput[] = [];
    const gas = pick(override?.gas, lease.gasCharge);
    const water = pick(override?.water, lease.waterCharge);
    const electricity = pick(override?.electricity, lease.electricityCharge);
    const internet = pick(override?.internet, lease.internetCharge);

    if (gas && gas.gt(0))
        items.push({
            category: LineItemCategory.GAS,
            description: "Gas",
            amount: gas,
        });
    if (water && water.gt(0))
        items.push({
            category: LineItemCategory.WATER,
            description: "Water",
            amount: water,
        });
    if (electricity && electricity.gt(0))
        items.push({
            category: LineItemCategory.ELECTRICITY,
            description: "Electricity",
            amount: electricity,
        });
    if (internet && internet.gt(0))
        items.push({
            category: LineItemCategory.INTERNET,
            description: "Internet",
            amount: internet,
        });

    return items;
};

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
    const penalty = new Prisma.Decimal(payload.penaltyAmount ?? 0);

    const utilities = buildUtilityLineItems(lease, payload.utilities);
    // If caller passes a raw utilityAmount (legacy / metered), treat it as a single OTHER line
    const legacyUtility =
        payload.utilityAmount !== undefined && utilities.length === 0
            ? new Prisma.Decimal(payload.utilityAmount)
            : new Prisma.Decimal(0);
    const utilityFromItems = utilities.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
    );
    const utility = utilityFromItems.add(legacyUtility);
    const total = rent.add(serviceCharge).add(utility).add(penalty);

    const dueDate = payload.dueDate
        ? new Date(payload.dueDate)
        : new Date(
              billingMonth.getFullYear(),
              billingMonth.getMonth(),
              lease.rentDueDay,
          );

    const lineItems: LineItemInput[] = [
        {
            category: LineItemCategory.RENT,
            description: "Monthly Rent",
            amount: rent,
        },
        ...(serviceCharge.gt(0)
            ? [
                  {
                      category: LineItemCategory.SERVICE_CHARGE,
                      description: "Service Charge",
                      amount: serviceCharge,
                  },
              ]
            : []),
        ...utilities,
        ...(legacyUtility.gt(0)
            ? [
                  {
                      category: LineItemCategory.OTHER,
                      description: "Utilities",
                      amount: legacyUtility,
                  },
              ]
            : []),
        ...(penalty.gt(0)
            ? [
                  {
                      category: LineItemCategory.PENALTY,
                      description: "Late Payment Penalty",
                      amount: penalty,
                  },
              ]
            : []),
    ];

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
            lineItems: { create: lineItems },
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
        const utilities = buildUtilityLineItems(lease);
        const utilityTotal = utilities.reduce(
            (sum, item) => sum.add(item.amount),
            new Prisma.Decimal(0),
        );
        const total = rent.add(sc).add(utilityTotal);
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
                utilityAmount: utilityTotal,
                totalAmount: total,
                dueAmount: total,
                organizationId,
                leaseId: lease.id,
                unitId: lease.unitId,
                tenantId: lease.tenantId,
                lineItems: {
                    create: [
                        {
                            category: LineItemCategory.RENT,
                            description: "Monthly Rent",
                            amount: rent,
                        },
                        ...(sc.gt(0)
                            ? [
                                  {
                                      category: LineItemCategory.SERVICE_CHARGE,
                                      description: "Service Charge",
                                      amount: sc,
                                  },
                              ]
                            : []),
                        ...utilities,
                    ],
                },
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
            lineItems: true,
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
