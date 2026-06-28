import status from "http-status";
import {
    PaymentStatus,
    SubscriptionPlan,
    SubscriptionRequestStatus,
    SubscriptionStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { SubscriptionService } from "../subscription/subscription.service";
import {
    ICreateSubscriptionRequestPayload,
    IReviewSubscriptionRequestPayload,
} from "./subscriptionRequest.interface";

// The platform's receiving bKash/Nagad number. Configurable via env so it can
// change without a redeploy; falls back to a placeholder in development. Read
// at request time (not module load) so it doesn't depend on env-load ordering.
const getPlatformBkashNumber = () =>
    process.env.SUBSCRIPTION_BKASH_NUMBER || "01700000000";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const getPaymentInfo = async () => ({
    bkashNumber: getPlatformBkashNumber(),
    accountType: "Personal",
    instructions:
        "Send Money to the number above using the plan's price, then submit the TrxID below. An admin will verify the payment and activate your plan.",
});

const createRequest = async (
    user: IRequestUser,
    payload: ICreateSubscriptionRequestPayload,
) => {
    const organizationId = assertOrg(user);

    if (payload.targetPlan === SubscriptionPlan.FREE) {
        throw new AppError(
            status.BAD_REQUEST,
            "The Free plan does not require a payment request.",
        );
    }

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
    });
    if (!subscription) {
        throw new AppError(status.NOT_FOUND, "Subscription not found");
    }
    if (
        subscription.plan === payload.targetPlan &&
        subscription.status === SubscriptionStatus.ACTIVE
    ) {
        throw new AppError(
            status.BAD_REQUEST,
            `You are already on the ${payload.targetPlan} plan`,
        );
    }

    const pending = await prisma.subscriptionRequest.findFirst({
        where: { organizationId, status: SubscriptionRequestStatus.PENDING },
    });
    if (pending) {
        throw new AppError(
            status.BAD_REQUEST,
            "You already have a pending payment request. Please wait for it to be reviewed.",
        );
    }

    // Price is taken from the plan catalog, not the client.
    const preset = await SubscriptionService.getPlanConfig(payload.targetPlan);

    return prisma.subscriptionRequest.create({
        data: {
            organizationId,
            requestedById: user.userId,
            targetPlan: payload.targetPlan,
            amount: preset.priceMonthly,
            method: payload.method,
            senderNumber: payload.senderNumber,
            transactionId: payload.transactionId,
        },
    });
};

const getMyRequests = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);
    return prisma.subscriptionRequest.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
    });
};

const listRequests = async (query: { status?: SubscriptionRequestStatus }) => {
    return prisma.subscriptionRequest.findMany({
        where: { ...(query.status && { status: query.status }) },
        include: {
            organization: {
                select: { id: true, name: true, email: true, slug: true },
            },
            requestedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });
};

const approveRequest = async (
    user: IRequestUser,
    id: string,
    payload: IReviewSubscriptionRequestPayload,
) => {
    const request = await prisma.subscriptionRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError(status.NOT_FOUND, "Payment request not found");
    }
    if (request.status !== SubscriptionRequestStatus.PENDING) {
        throw new AppError(
            status.BAD_REQUEST,
            `This request has already been ${request.status.toLowerCase()}`,
        );
    }

    // Activate the requested plan (enforces usage-within-limits).
    const subscription = await SubscriptionService.applyPlanChange(
        request.organizationId,
        request.targetPlan,
    );

    // Record the verified payment for audit / billing history.
    const now = new Date();
    const periodEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
    );
    await prisma.platformPayment.create({
        data: {
            amount: request.amount,
            method: request.method,
            transactionId: request.transactionId,
            status: PaymentStatus.PAID,
            billingPeriodStart: now,
            billingPeriodEnd: periodEnd,
            organizationId: request.organizationId,
            subscriptionId: subscription.id,
        },
    });

    return prisma.subscriptionRequest.update({
        where: { id },
        data: {
            status: SubscriptionRequestStatus.APPROVED,
            reviewNote: payload.note,
            reviewedById: user.userId,
            reviewedAt: now,
        },
    });
};

const rejectRequest = async (
    user: IRequestUser,
    id: string,
    payload: IReviewSubscriptionRequestPayload,
) => {
    const request = await prisma.subscriptionRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError(status.NOT_FOUND, "Payment request not found");
    }
    if (request.status !== SubscriptionRequestStatus.PENDING) {
        throw new AppError(
            status.BAD_REQUEST,
            `This request has already been ${request.status.toLowerCase()}`,
        );
    }

    return prisma.subscriptionRequest.update({
        where: { id },
        data: {
            status: SubscriptionRequestStatus.REJECTED,
            reviewNote: payload.note,
            reviewedById: user.userId,
            reviewedAt: new Date(),
        },
    });
};

export const SubscriptionRequestService = {
    getPaymentInfo,
    createRequest,
    getMyRequests,
    listRequests,
    approveRequest,
    rejectRequest,
};
