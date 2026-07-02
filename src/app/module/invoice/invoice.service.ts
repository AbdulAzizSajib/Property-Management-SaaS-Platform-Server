import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
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

// Active statuses that still represent money owed (and so can be carried forward).
const OWED_STATUSES = [
    PaymentStatus.PARTIAL,
    PaymentStatus.DUE,
    PaymentStatus.OVERDUE,
] as const;

// Derive the correct status for an invoice from its numbers. Used when
// restoring an invoice whose carry-forward is being reversed.
const deriveStatus = (
    due: Prisma.Decimal,
    paid: Prisma.Decimal,
    dueDate: Date,
    now: Date,
): PaymentStatus => {
    if (due.lte(0)) return PaymentStatus.PAID;
    if (paid.gt(0)) return PaymentStatus.PARTIAL;
    return dueDate < now ? PaymentStatus.OVERDUE : PaymentStatus.DUE;
};

type CarriedSource = {
    id: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    dueDate: Date;
};

// Reverse a carry-forward: each source invoice gets its own unpaid balance back
// and is detached from the (now cancelled/deleted) invoice that had absorbed it.
const restoreCarriedForwardSources = async (
    tx: Prisma.TransactionClient,
    sources: CarriedSource[],
    now: Date,
) => {
    for (const src of sources) {
        const paid = new Prisma.Decimal(src.paidAmount);
        const due = new Prisma.Decimal(src.totalAmount).sub(paid);
        const restored = due.lessThan(0) ? new Prisma.Decimal(0) : due;
        await tx.invoice.update({
            where: { id: src.id },
            data: {
                status: deriveStatus(restored, paid, src.dueDate, now),
                dueAmount: restored,
                carriedForwardToId: null,
                carriedForwardAt: null,
            },
        });
    }
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
};

type LineItemInput = {
    category: LineItemCategory;
    description: string;
    amount: Prisma.Decimal;
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

    // Carry forward any unpaid balance from previous invoices of this lease.
    // One PREVIOUS_DUE line item is emitted per source invoice so the new
    // invoice records exactly which older invoices it absorbed — the frontend
    // links each line back to its source.
    const owedPrevious = await prisma.invoice.findMany({
        where: {
            leaseId: lease.id,
            billingMonth: { lt: billingMonth },
            status: { in: [...OWED_STATUSES] },
        },
        select: {
            id: true,
            invoiceNumber: true,
            billingMonth: true,
            dueAmount: true,
        },
        orderBy: { billingMonth: "asc" },
    });

    // Carry forward is opt-in: only the invoices the owner explicitly selected
    // are rolled in. Nothing selected → a plain current-month invoice, and the
    // older dues keep showing as their own outstanding invoices.
    const selectedIds = payload.carryForwardInvoiceIds ?? [];
    let sourcesToCarry = owedPrevious;
    if (selectedIds.length === 0) {
        sourcesToCarry = [];
    } else {
        const owedById = new Map(owedPrevious.map((i) => [i.id, i]));
        const invalid = selectedIds.filter((id) => !owedById.has(id));
        if (invalid.length) {
            throw new AppError(
                status.BAD_REQUEST,
                `Cannot carry forward these invoices — they are not outstanding earlier invoices of this lease: ${invalid.join(", ")}`,
            );
        }
        sourcesToCarry = selectedIds
            .map((id) => owedById.get(id)!)
            .filter((s) => new Prisma.Decimal(s.dueAmount).gt(0));
    }

    const previousDueItems = buildPreviousDueLineItems(sourcesToCarry);
    const previousDue = previousDueItems.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
    );

    const total = rent.add(serviceCharge).add(previousDue);

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
        ...previousDueItems,
    ];

    const now = new Date();

    // Create the invoice and, in the same transaction, mark every source
    // invoice as CARRIED_FORWARD so its balance is no longer counted twice.
    // The debt now lives only on this new invoice.
    return prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
            data: {
                invoiceNumber: generateInvoiceNumber(organizationId),
                type: InvoiceType.RENT,
                status: PaymentStatus.DUE,
                billingMonth,
                dueDate,
                rentAmount: rent,
                serviceCharge,
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

        if (sourcesToCarry.length > 0) {
            await tx.invoice.updateMany({
                where: { id: { in: sourcesToCarry.map((s) => s.id) } },
                data: {
                    status: PaymentStatus.CARRIED_FORWARD,
                    dueAmount: new Prisma.Decimal(0),
                    carriedForwardToId: created.id,
                    carriedForwardAt: now,
                },
            });
        }

        return created;
    });
};

const generateMonthlyBatch = async (
    user: IRequestUser,
    payload: IGenerateMonthlyPayload,
) => {
    const organizationId = assertOrg(user);
    const billingMonth = monthStart(new Date(payload.billingMonth));
    // Bulk run carries every outstanding balance forward unless told otherwise.
    const carryForward = payload.carryForward !== false;

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

    // Optional building filter — only bill leases whose unit is in this building.
    if (payload.buildingId) {
        const building = await prisma.building.findFirst({
            where: { id: payload.buildingId, organizationId },
            select: { id: true },
        });
        if (!building) {
            throw new AppError(status.NOT_FOUND, "Building not found");
        }
    }

    const activeLeases = await prisma.lease.findMany({
        where: {
            organizationId,
            status: LeaseStatus.ACTIVE,
            tenant: { isActive: true },
            ...(payload.buildingId
                ? { unit: { buildingId: payload.buildingId } }
                : {}),
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

        // Carry forward any unpaid balance from previous invoices of this
        // lease — one PREVIOUS_DUE line item per source invoice (see
        // buildPreviousDueLineItems).
        const unpaidInvoices = carryForward
            ? await prisma.invoice.findMany({
                  where: {
                      leaseId: lease.id,
                      billingMonth: { lt: billingMonth },
                      status: { in: [...OWED_STATUSES] },
                  },
                  select: {
                      id: true,
                      invoiceNumber: true,
                      billingMonth: true,
                      dueAmount: true,
                  },
                  orderBy: { billingMonth: "asc" },
              })
            : [];
        const sourcesToCarry = unpaidInvoices.filter((s) =>
            new Prisma.Decimal(s.dueAmount).gt(0),
        );
        const previousDueItems = buildPreviousDueLineItems(sourcesToCarry);
        const previousDue = previousDueItems.reduce(
            (sum, item) => sum.add(item.amount),
            new Prisma.Decimal(0),
        );

        const total = rent.add(sc).add(previousDue);

        if (total.lte(0)) {
            skipped.push(lease.id);
            continue;
        }

        const dueDate = computeDueDate(billingMonth, lease.rentDueDay);
        const now = new Date();

        const inv = await prisma.$transaction(async (tx) => {
            const createdInv = await tx.invoice.create({
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
                            ...previousDueItems,
                        ],
                    },
                },
            });

            if (sourcesToCarry.length > 0) {
                await tx.invoice.updateMany({
                    where: { id: { in: sourcesToCarry.map((s) => s.id) } },
                    data: {
                        status: PaymentStatus.CARRIED_FORWARD,
                        dueAmount: new Prisma.Decimal(0),
                        carriedForwardToId: createdInv.id,
                        carriedForwardAt: now,
                    },
                });
            }

            return createdInv;
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
    if (query.buildingId) where.unit = { buildingId: query.buildingId };

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
            // So the list can show "Carried forward → INV-…" instead of a
            // misleading "Fully paid" on CARRIED_FORWARD rows.
            carriedForwardTo: {
                select: { id: true, invoiceNumber: true, billingMonth: true },
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
            // The newer invoice this one's balance was rolled into (if any)...
            carriedForwardTo: {
                select: {
                    id: true,
                    invoiceNumber: true,
                    billingMonth: true,
                    status: true,
                },
            },
            // ...and the older invoices whose balances this one absorbed.
            carriedForwardFrom: {
                select: {
                    id: true,
                    invoiceNumber: true,
                    billingMonth: true,
                    totalAmount: true,
                    paidAmount: true,
                },
            },
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

    const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
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

    if (invoice.status === PaymentStatus.CARRIED_FORWARD) {
        throw new AppError(
            status.BAD_REQUEST,
            "This invoice's balance was carried into a newer invoice. Edit the newer invoice instead.",
        );
    }

    // Only the due date and notes are editable; the charged amounts are
    // derived from the lease and never edited directly.
    const data: Prisma.InvoiceUpdateInput = {};

    if (payload.notes !== undefined) {
        data.notes = payload.notes;
    }

    if (payload.dueDate) {
        const newDueDate = new Date(payload.dueDate);
        validateDueDate(newDueDate, invoice.billingMonth);
        data.dueDate = newDueDate;
    }

    return prisma.invoice.update({
        where: { id },
        data,
        include: { lineItems: true },
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
        include: { payments: true, carriedForwardFrom: true },
    });

    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    if (invoice.status === PaymentStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Invoice already cancelled");
    }

    if (invoice.status === PaymentStatus.CARRIED_FORWARD) {
        throw new AppError(
            status.BAD_REQUEST,
            "This invoice's balance was carried into a newer invoice. Cancel the newer invoice first.",
        );
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

    const now = new Date();

    // Cancelling an invoice that absorbed previous dues must hand those dues
    // back to their source invoices, otherwise the carried balance vanishes.
    return prisma.$transaction(async (tx) => {
        await restoreCarriedForwardSources(tx, invoice.carriedForwardFrom, now);

        return tx.invoice.update({
            where: { id },
            data: {
                status: PaymentStatus.CANCELLED,
                cancelledAt: now,
                cancelReason: payload.reason,
                dueAmount: new Prisma.Decimal(0),
            },
        });
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
        include: { payments: true, carriedForwardFrom: true },
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

    const now = new Date();

    // Hand any absorbed previous dues back to their sources before deleting,
    // so the carried balance is not silently lost.
    await prisma.$transaction(async (tx) => {
        await restoreCarriedForwardSources(tx, invoice.carriedForwardFrom, now);
        await tx.invoice.delete({ where: { id } });
    });

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
