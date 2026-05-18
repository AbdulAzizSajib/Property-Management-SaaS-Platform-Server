import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { PaymentStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreatePaymentPayload,
    IPaymentQuery,
} from "./payment.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const generateReceiptNumber = (organizationId: string) => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `RCPT-${ymd}-${organizationId.slice(0, 4).toUpperCase()}-${rand}`;
};

const recordPayment = async (
    user: IRequestUser,
    payload: ICreatePaymentPayload,
) => {
    const organizationId = assertOrg(user);

    const invoice = await prisma.invoice.findFirst({
        where: { id: payload.invoiceId, organizationId },
    });
    if (!invoice) {
        throw new AppError(status.NOT_FOUND, "Invoice not found");
    }

    if (invoice.status === PaymentStatus.PAID) {
        throw new AppError(status.BAD_REQUEST, "Invoice is already paid");
    }

    const amount = new Prisma.Decimal(payload.amount);
    const remainingBefore = new Prisma.Decimal(invoice.dueAmount);

    if (amount.greaterThan(remainingBefore)) {
        throw new AppError(
            status.BAD_REQUEST,
            `Amount exceeds remaining due (${remainingBefore.toString()})`,
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
            data: {
                receiptNumber: generateReceiptNumber(organizationId),
                amount,
                method: payload.method,
                status: PaymentStatus.PAID,
                paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
                transactionId: payload.transactionId,
                notes: payload.notes,
                receiptUrl: payload.receiptUrl,
                organizationId,
                invoiceId: invoice.id,
                leaseId: invoice.leaseId,
                tenantId: invoice.tenantId,
                recordedById: user.userId,
            },
        });

        const newPaid = new Prisma.Decimal(invoice.paidAmount).add(amount);
        const newDue = new Prisma.Decimal(invoice.totalAmount).sub(newPaid);
        const newStatus = newDue.lessThanOrEqualTo(0)
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIAL;

        await tx.invoice.update({
            where: { id: invoice.id },
            data: {
                paidAmount: newPaid,
                dueAmount: newDue.lessThan(0) ? new Prisma.Decimal(0) : newDue,
                status: newStatus,
            },
        });

        return payment;
    });

    return result;
};

const getAllPayments = async (user: IRequestUser, query: IPaymentQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.PaymentWhereInput = { organizationId };
    if (query.leaseId) where.leaseId = query.leaseId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;

    return prisma.payment.findMany({
        where,
        include: {
            tenant: { select: { id: true, name: true, phone: true } },
            invoice: { select: { id: true, invoiceNumber: true } },
        },
        orderBy: { paidAt: "desc" },
    });
};

const getPaymentById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const payment = await prisma.payment.findFirst({
        where: { id, organizationId },
        include: { tenant: true, invoice: true, lease: true },
    });

    if (!payment) {
        throw new AppError(status.NOT_FOUND, "Payment not found");
    }

    return payment;
};

export const PaymentService = {
    recordPayment,
    getAllPayments,
    getPaymentById,
};
