/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role, SubscriptionStatus } from "../../generated/prisma/enums";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";

const BLOCKED_SUB_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.CANCELLED,
];

export const requireActiveOrg = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user;

        if (!user) {
            throw new AppError(
                status.UNAUTHORIZED,
                "Authentication required before checking organization access",
            );
        }

        // Super admin bypasses tenancy checks
        if (user.role === Role.SUPER_ADMIN) {
            return next();
        }

        if (!user.organizationId) {
            throw new AppError(
                status.FORBIDDEN,
                "Your account is not associated with any organization",
            );
        }

        const organization = await prisma.organization.findUnique({
            where: { id: user.organizationId },
            include: { subscription: true },
        });

        if (!organization) {
            throw new AppError(status.NOT_FOUND, "Organization not found");
        }

        if (!organization.isActive) {
            throw new AppError(
                status.FORBIDDEN,
                "Your organization is inactive. Please contact support.",
            );
        }

        const subscription = organization.subscription;

        if (!subscription) {
            throw new AppError(
                status.FORBIDDEN,
                "No active subscription found for your organization",
            );
        }

        if (BLOCKED_SUB_STATUSES.includes(subscription.status)) {
            throw new AppError(
                status.PAYMENT_REQUIRED,
                `Subscription is ${subscription.status}. Please renew to continue.`,
            );
        }

        // Trial expiry check
        if (
            subscription.status === SubscriptionStatus.TRIALING &&
            subscription.trialEndsAt &&
            subscription.trialEndsAt.getTime() < Date.now()
        ) {
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: SubscriptionStatus.EXPIRED },
            });

            throw new AppError(
                status.PAYMENT_REQUIRED,
                "Free trial has ended. Please upgrade your plan to continue.",
            );
        }

        // Paid plan expiry check
        if (
            subscription.endDate &&
            subscription.endDate.getTime() < Date.now() &&
            subscription.status !== SubscriptionStatus.PAST_DUE
        ) {
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: SubscriptionStatus.EXPIRED },
            });

            throw new AppError(
                status.PAYMENT_REQUIRED,
                "Subscription has expired. Please renew to continue.",
            );
        }

        next();
    } catch (error: any) {
        next(error);
    }
};
