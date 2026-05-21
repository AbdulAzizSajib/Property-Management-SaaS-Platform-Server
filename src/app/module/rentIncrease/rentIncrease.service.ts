import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { LeaseStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateRentIncreasePayload } from "./rentIncrease.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const createRentIncrease = async (
    user: IRequestUser,
    leaseId: string,
    payload: ICreateRentIncreasePayload,
) => {
    const organizationId = assertOrg(user);

    const lease = await prisma.lease.findFirst({
        where: { id: leaseId, organizationId },
    });
    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Lease not found");
    }
    if (lease.status !== LeaseStatus.ACTIVE) {
        throw new AppError(status.BAD_REQUEST, "Can only apply rent increase to an active lease");
    }

    const previousRent = lease.monthlyRent;
    const newRent = new Prisma.Decimal(payload.newRent);

    if (newRent.lessThanOrEqualTo(previousRent)) {
        throw new AppError(status.BAD_REQUEST, "New rent must be greater than current rent");
    }

    return prisma.$transaction(async (tx) => {
        const increase = await tx.rentIncrease.create({
            data: {
                leaseId,
                previousRent,
                newRent,
                effectiveFrom: new Date(payload.effectiveFrom),
                reason: payload.reason,
            },
        });

        await tx.lease.update({
            where: { id: leaseId },
            data: { monthlyRent: newRent },
        });

        return increase;
    });
};

const getRentIncreasesByLease = async (user: IRequestUser, leaseId: string) => {
    const organizationId = assertOrg(user);

    const lease = await prisma.lease.findFirst({
        where: { id: leaseId, organizationId },
    });
    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Lease not found");
    }

    return prisma.rentIncrease.findMany({
        where: { leaseId },
        orderBy: { effectiveFrom: "desc" },
    });
};

export const RentIncreaseService = {
    createRentIncrease,
    getRentIncreasesByLease,
};
