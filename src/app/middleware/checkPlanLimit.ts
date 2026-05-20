/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role } from "../../generated/prisma/enums";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";

type ResourceType = "building" | "unit" | "tenant";

export const checkPlanLimit =
    (resource: ResourceType) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new AppError(status.UNAUTHORIZED, "Authentication required");
            }

            if (user.role === Role.SUPER_ADMIN) return next();

            if (!user.organizationId) {
                throw new AppError(
                    status.FORBIDDEN,
                    "Your account is not associated with any organization",
                );
            }

            const subscription = await prisma.subscription.findUnique({
                where: { organizationId: user.organizationId },
            });

            if (!subscription) {
                throw new AppError(
                    status.FORBIDDEN,
                    "No active subscription found",
                );
            }

            const orgId = user.organizationId;
            let currentCount = 0;
            let limit = 0;
            let label = "";

            if (resource === "building") {
                currentCount = await prisma.building.count({
                    where: { organizationId: orgId },
                });
                limit = subscription.buildingLimit;
                label = "buildings";
            } else if (resource === "unit") {
                currentCount = await prisma.unit.count({
                    where: { building: { organizationId: orgId } },
                });
                limit = subscription.unitLimit;
                label = "units";
            } else if (resource === "tenant") {
                currentCount = await prisma.tenant.count({
                    where: { organizationId: orgId },
                });
                limit = subscription.tenantLimit;
                label = "tenants";
            }

            if (currentCount >= limit) {
                throw new AppError(
                    status.PAYMENT_REQUIRED,
                    `Your plan allows up to ${limit} ${label}. Please upgrade to add more.`,
                );
            }

            next();
        } catch (error: any) {
            next(error);
        }
    };
