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
import { Role } from "../../../generated/prisma/enums";
import {
    ICancelInvoicePayload,
    IGenerateInvoicePayload,
    IGenerateMonthlyPayload,
    IInvoiceQuery,
    IUpdateInvoicePayload,
} from "./invoice.interface";

const MAX_MONTHS_AHEAD = 3;
const MAX_MONTHS_BEHIND = 12;
const MAX_DUE_DATE_OFFSET_DAYS = 60;

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

const monthsBetween = (a: Date, b: Date) =>
    (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

const lastDayOfMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

const computeDueDate = (billingMonth: Date, rentDueDay: number) => {
    const safeDay = Math.min(rentDueDay, lastDayOfMonth(billingMonth));
    return new Date(billingMonth.getFullYear(), billingMonth.getMonth(), safeDay);
};

type LeaseForInvoice = {
    id: string;
    organizationId: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date | null;
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

type UnpaidSource = {
    id: string;
    invoiceNumber: string;
    billingMonth: Date;
    dueAmount: Prisma.Decimal;
};

const monthLabel = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", year: "numeric" });

// Build one PREVIOUS_DUE line item per unpaid source invoice. The source
// invoice id is embedded in the description as a `[id:<uuid>]` tag so the
// frontend can link each line back to the invoice it carried over from.
// Keep this tag format in sync with the parser on the invoice detail page.
const buildPreviousDueLineItems = (
    sources: UnpaidSource[],
): LineItemInput[] =>
    sources
        .filter((s) => new Prisma.Decimal(s.dueAmount).gt(0))
        .map((s) => ({
            category: LineItemCategory.PREVIOUS_DUE,
            description: `Previous due · ${s.invoiceNumber} (${monthLabel(
                s.billingMonth,
            )}) [id:${s.id}]`,
            amount: new Prisma.Decimal(s.dueAmount),
        }));

const validateBillingMonth = (billingMonth: Date, lease: LeaseForInvoice) => {
    const now = new Date();
    const currentMonth = monthStart(now);
    const monthsDiff = monthsBetween(billingMonth, currentMonth);

    if (monthsDiff > MAX_MONTHS_AHEAD) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot generate invoice more than ${MAX_MONTHS_AHEAD} months in advance`,
        );
    }
    if (monthsDiff < -MAX_MONTHS_BEHIND) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot backfill invoices older than ${MAX_MONTHS_BEHIND} months`,
        );
    }

    const leaseStartMonth = monthStart(lease.startDate);
    if (billingMonth < leaseStartMonth) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot bill before lease start (${lease.startDate.toISOString().slice(0, 10)})`,
        );
    }

    if (lease.endDate) {
        const leaseEndMonth = monthStart(lease.endDate);
        if (billingMonth > leaseEndMonth) {
            throw new AppError(
                status.BAD_REQUEST,
                `Cannot bill after lease end (${lease.endDate.toISOString().slice(0, 10)})`,
            );
        }
    }
};

const validateDueDate = (dueDate: Date, billingMonth: Date) => {
    if (dueDate < billingMonth) {
        throw new AppError(
            status.BAD_REQUEST,
            "Due date cannot be before billing month",
        );
    }
    const maxDueDate = new Date(billingMonth);
    maxDueDate.setDate(maxDueDate.getDate() + MAX_DUE_DATE_OFFSET_DAYS);
    if (dueDate > maxDueDate) {
        throw new AppError(
            status.BAD_REQUEST,
            `Due date cannot be more than ${MAX_DUE_DATE_OFFSET_DAYS} days after billing month`,
        );
    }
};

const generateOne = async (
    user: IRequestUser,
    payload: IGenerateInvoicePayload,
) => {
    const organizationId = assertOrg(user);

    // Conflict: cannot pass both utilities breakdown and utilityAmount
    if (payload.utilityAmount !== undefined && payload.utilities) {
        throw new AppError(
            status.BAD_REQUEST,
            "Provide either 'utilities' (breakdown) or 'utilityAmount' (single amount), not both.",
        );
    }

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

    // Tenant must still be active
    const tenant = await prisma.tenant.findUnique({
        where: { id: lease.tenantId },
        select: { id: true, isActive: true },
    });
    if (!tenant?.isActive) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot bill an inactive tenant",
        );
    }

    // utilities override only allowed for FIXED_SEPARATE leases
    if (payload.utilities && lease.billingMode !== BillingMode.FIXED_SEPARATE) {
        throw new AppError(
            status.BAD_REQUEST,
            "Utility breakdown only allowed for FIXED_SEPARATE leases. Use 'utilityAmount' for one-off amounts on INCLUSIVE leases.",
        );
    }

    const billingMonth = monthStart(new Date(payload.billingMonth));

    validateBillingMonth(billingMonth, lease);

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
    const legacyUtility =
        payload.utilityAmount !== undefined && utilities.length === 0
            ? new Prisma.Decimal(payload.utilityAmount)
            : new Prisma.Decimal(0);
    const utilityFromItems = utilities.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
    );
    const utility = utilityFromItems.add(legacyUtility);

    // Carry forward any unpaid balance from previous invoices of this lease.
    // One PREVIOUS_DUE line item is emitted per source invoice so the new
    // invoice records exactly which older invoices it absorbed — the frontend
    // links each line back to its source.
    const unpaidInvoices = await prisma.invoice.findMany({
        where: {
            leaseId: lease.id,
            billingMonth: { lt: billingMonth },
            status: { in: [PaymentStatus.PARTIAL, PaymentStatus.DUE, PaymentStatus.OVERDUE] },
        },
        select: {
            id: true,
            invoiceNumber: true,
            billingMonth: true,
            dueAmount: true,
        },
        orderBy: { billingMonth: "asc" },
    });
    const previousDueItems = buildPreviousDueLineItems(unpaidInvoices);
    const previousDue = previousDueItems.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
    );

    const total = rent.add(serviceCharge).add(utility).add(penalty).add(previousDue);

    if (total.lte(0)) {
        throw new AppError(
            status.BAD_REQUEST,
            "Invoice total must be greater than 0",
        );
    }

    const dueDate = payload.dueDate
        ? new Date(payload.dueDate)
        : computeDueDate(billingMonth, lease.rentDueDay);

    validateDueDate(dueDate, billingMonth);

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
        ...previousDueItems,
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

    // Date sanity for the batch as a whole
    const now = new Date();
    const currentMonth = monthStart(now);
    const monthsDiff = monthsBetween(billingMonth, currentMonth);
    if (monthsDiff > MAX_MONTHS_AHEAD) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot generate invoices more than ${MAX_MONTHS_AHEAD} months in advance`,
        );
    }
    if (monthsDiff < -MAX_MONTHS_BEHIND) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot backfill invoices older than ${MAX_MONTHS_BEHIND} months`,
        );
    }

    const activeLeases = await prisma.lease.findMany({
        where: {
            organizationId,
            status: LeaseStatus.ACTIVE,
            tenant: { isActive: true },
        },
    });

    const created: string[] = [];
    const skipped: string[] = [];

    for (const lease of activeLeases) {
        // Skip leases that haven't started yet for this billing month
        if (monthStart(lease.startDate) > billingMonth) {
            skipped.push(lease.id);
            continue;
        }
        // Skip leases that ended before this billing month
        if (lease.endDate && monthStart(lease.endDate) < billingMonth) {
            skipped.push(lease.id);
            continue;
        }

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

        // Carry forward any unpaid balance from previous invoices of this
        // lease — one PREVIOUS_DUE line item per source invoice (see
        // buildPreviousDueLineItems).
        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                leaseId: lease.id,
                billingMonth: { lt: billingMonth },
                status: { in: [PaymentStatus.PARTIAL, PaymentStatus.DUE, PaymentStatus.OVERDUE] },
            },
            select: {
                id: true,
                invoiceNumber: true,
                billingMonth: true,
                dueAmount: true,
            },
            orderBy: { billingMonth: "asc" },
        });
        const previousDueItems = buildPreviousDueLineItems(unpaidInvoices);
        const previousDue = previousDueItems.reduce(
            (sum, item) => sum.add(item.amount),
            new Prisma.Decimal(0),
        );

        const total = rent.add(sc).add(utilityTotal).add(previousDue);

        if (total.lte(0)) {
            skipped.push(lease.id);
            continue;
        }

        const dueDate = computeDueDate(billingMonth, lease.rentDueDay);

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
                        ...previousDueItems,
                    ],
                },
            },
        });
        created.push(inv.id);
    }

    return { createdCount: created.length, skippedCount: skipped.length };
};

const parseBillingMonth = (raw: string, field: string): Date => {
    // Accept "YYYY-MM" shorthand for convenience
    const ymMatch = /^(\d{4})-(\d{2})$/.exec(raw);
    const d = ymMatch
        ? new Date(Number(ymMatch[1]), Number(ymMatch[2]) - 1, 1)
        : new Date(raw);
    if (Number.isNaN(d.getTime())) {
        throw new AppError(
            status.BAD_REQUEST,
            `Invalid ${field}: expected YYYY-MM or ISO date`,
        );
    }
    return monthStart(d);
};

const getAllInvoices = async (user: IRequestUser, query: IInvoiceQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.InvoiceWhereInput = { organizationId };
    if (query.leaseId) where.leaseId = query.leaseId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.unitId) where.unitId = query.unitId;

    if (query.status) {
        const allowed = new Set(Object.values(PaymentStatus) as string[]);
        const values = String(query.status)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const invalid = values.filter((v) => !allowed.has(v));
        if (invalid.length) {
            throw new AppError(
                status.BAD_REQUEST,
                `Invalid status value(s): ${invalid.join(", ")}`,
            );
        }
        where.status =
            values.length === 1
                ? (values[0] as PaymentStatus)
                : { in: values as PaymentStatus[] };
    }

    if (query.billingMonth) {
        where.billingMonth = parseBillingMonth(query.billingMonth, "billingMonth");
    } else if (query.billingMonthFrom || query.billingMonthTo) {
        const range: Prisma.DateTimeFilter = {};
        if (query.billingMonthFrom) {
            range.gte = parseBillingMonth(
                query.billingMonthFrom,
                "billingMonthFrom",
            );
        }
        if (query.billingMonthTo) {
            range.lte = parseBillingMonth(
                query.billingMonthTo,
                "billingMonthTo",
            );
        }
        where.billingMonth = range;
    }

    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] =
        query.sort === "billingMonth_asc"
            ? [{ billingMonth: "asc" }, { createdAt: "asc" }]
            : [{ billingMonth: "desc" }, { createdAt: "desc" }];

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
        orderBy,
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

const updateInvoice = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateInvoicePayload,
) => {
    const organizationId = assertOrg(user);

    if (payload.utilityAmount !== undefined && payload.utilities) {
        throw new AppError(
            status.BAD_REQUEST,
            "Provide either 'utilities' (breakdown) or 'utilityAmount' (single amount), not both.",
        );
    }

    const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
        include: { lease: true, payments: true },
    });

    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    if (invoice.status === PaymentStatus.CANCELLED) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot edit a cancelled invoice",
        );
    }

    const hasPayments = invoice.payments.length > 0;

    // Notes can always be edited
    const data: Prisma.InvoiceUpdateInput = {};
    let needsRecompute = false;

    if (payload.notes !== undefined) {
        data.notes = payload.notes;
    }

    // Financial fields editable only when no payments exist
    const financialFields = [
        payload.dueDate,
        payload.penaltyAmount,
        payload.utilityAmount,
        payload.utilities,
    ];
    const hasFinancialEdit = financialFields.some((f) => f !== undefined);

    if (hasFinancialEdit) {
        if (hasPayments) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot edit financial fields after payments have been recorded. Cancel and recreate the invoice instead.",
            );
        }

        if (
            payload.utilities &&
            invoice.lease.billingMode !== BillingMode.FIXED_SEPARATE
        ) {
            throw new AppError(
                status.BAD_REQUEST,
                "Utility breakdown only allowed for FIXED_SEPARATE leases",
            );
        }

        if (payload.dueDate) {
            const newDueDate = new Date(payload.dueDate);
            validateDueDate(newDueDate, invoice.billingMonth);
            data.dueDate = newDueDate;
        }

        needsRecompute =
            payload.penaltyAmount !== undefined ||
            payload.utilityAmount !== undefined ||
            payload.utilities !== undefined;
    }

    if (!needsRecompute) {
        return prisma.invoice.update({
            where: { id },
            data,
            include: { lineItems: true },
        });
    }

    // Recompute totals and line items
    const rent = new Prisma.Decimal(invoice.rentAmount);
    const serviceCharge = new Prisma.Decimal(invoice.serviceCharge);
    const penalty =
        payload.penaltyAmount !== undefined
            ? new Prisma.Decimal(payload.penaltyAmount)
            : new Prisma.Decimal(invoice.penaltyAmount);

    const utilityItems = payload.utilities
        ? buildUtilityLineItems(invoice.lease, payload.utilities)
        : [];
    const legacyUtility =
        payload.utilityAmount !== undefined && utilityItems.length === 0
            ? new Prisma.Decimal(payload.utilityAmount)
            : new Prisma.Decimal(0);

    let utility: Prisma.Decimal;
    let utilityLineItems: LineItemInput[] = [];

    if (payload.utilities !== undefined || payload.utilityAmount !== undefined) {
        utility = utilityItems
            .reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0))
            .add(legacyUtility);
        utilityLineItems = utilityItems;
    } else {
        utility = new Prisma.Decimal(invoice.utilityAmount);
    }

    const total = rent.add(serviceCharge).add(utility).add(penalty);

    if (total.lte(0)) {
        throw new AppError(
            status.BAD_REQUEST,
            "Invoice total must be greater than 0",
        );
    }

    const newLineItems: LineItemInput[] = [
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
        ...utilityLineItems,
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

    return prisma.$transaction(async (tx) => {
        if (
            payload.utilities !== undefined ||
            payload.utilityAmount !== undefined ||
            payload.penaltyAmount !== undefined
        ) {
            await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        }

        return tx.invoice.update({
            where: { id },
            data: {
                ...data,
                penaltyAmount: penalty,
                utilityAmount: utility,
                totalAmount: total,
                dueAmount: total,
                ...((payload.utilities !== undefined ||
                    payload.utilityAmount !== undefined ||
                    payload.penaltyAmount !== undefined) && {
                    lineItems: { create: newLineItems },
                }),
            },
            include: { lineItems: true },
        });
    });
};

const cancelInvoice = async (
    user: IRequestUser,
    id: string,
    payload: ICancelInvoicePayload,
) => {
    const organizationId = assertOrg(user);

    const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
        include: { payments: true },
    });

    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    if (invoice.status === PaymentStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Invoice already cancelled");
    }

    if (invoice.status === PaymentStatus.PAID) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot cancel a fully paid invoice. Issue a refund instead.",
        );
    }

    if (invoice.payments.length > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot cancel an invoice with payments. Refund/reverse the payments first.",
        );
    }

    return prisma.invoice.update({
        where: { id },
        data: {
            status: PaymentStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: payload.reason,
            dueAmount: new Prisma.Decimal(0),
        },
    });
};

const deleteInvoice = async (user: IRequestUser, id: string) => {
    if (user.role !== Role.SUPER_ADMIN) {
        throw new AppError(
            status.FORBIDDEN,
            "Only super admin can permanently delete invoices",
        );
    }

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { payments: true },
    });

    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    if (invoice.payments.length > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete an invoice with payments. Cancel it instead.",
        );
    }

    if (
        invoice.status !== PaymentStatus.DUE &&
        invoice.status !== PaymentStatus.CANCELLED
    ) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot delete invoice in status ${invoice.status}. Only DUE or CANCELLED invoices can be deleted.`,
        );
    }

    await prisma.invoice.delete({ where: { id } });

    return { id, deleted: true };
};

export const InvoiceService = {
    generateOne,
    generateMonthlyBatch,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
};
