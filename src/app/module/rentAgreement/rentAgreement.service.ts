import status from "http-status";
import { AgreementStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateRentAgreementPayload,
    ISignRentAgreementPayload,
} from "./rentAgreement.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const assertLease = async (leaseId: string, organizationId: string) => {
    const lease = await prisma.lease.findFirst({
        where: { id: leaseId, organizationId },
    });
    if (!lease) {
        throw new AppError(status.NOT_FOUND, "Lease not found");
    }
    return lease;
};

const getAgreementByLease = async (user: IRequestUser, leaseId: string) => {
    const organizationId = assertOrg(user);
    await assertLease(leaseId, organizationId);

    const agreement = await prisma.rentAgreement.findUnique({
        where: { leaseId },
        include: {
            lease: {
                include: {
                    tenant: { select: { id: true, name: true } },
                    unit: {
                        select: {
                            id: true,
                            name: true,
                            building: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });

    if (!agreement) {
        throw new AppError(status.NOT_FOUND, "No agreement found for this lease");
    }

    return agreement;
};

const createAgreement = async (
    user: IRequestUser,
    leaseId: string,
    payload: ICreateRentAgreementPayload,
) => {
    const organizationId = assertOrg(user);
    const lease = await assertLease(leaseId, organizationId);

    const existing = await prisma.rentAgreement.findUnique({ where: { leaseId } });
    if (existing) {
        throw new AppError(status.CONFLICT, "Agreement already exists for this lease. Use update to modify.");
    }

    return prisma.rentAgreement.create({
        data: {
            leaseId,
            tenantId: lease.tenantId,
            organizationId,
            content: payload.content,
            validFrom: payload.validFrom ? new Date(payload.validFrom) : undefined,
            validUntil: payload.validUntil ? new Date(payload.validUntil) : undefined,
            status: AgreementStatus.DRAFT,
        },
    });
};

const signAgreement = async (
    user: IRequestUser,
    leaseId: string,
    payload: ISignRentAgreementPayload,
) => {
    const organizationId = assertOrg(user);
    await assertLease(leaseId, organizationId);

    const agreement = await prisma.rentAgreement.findUnique({ where: { leaseId } });
    if (!agreement) {
        throw new AppError(status.NOT_FOUND, "Agreement not found for this lease");
    }

    const now = new Date();

    if (payload.role === "owner") {
        const bothSigned = agreement.signedByTenant;
        return prisma.rentAgreement.update({
            where: { leaseId },
            data: {
                signedByOwner: true,
                ownerSignedAt: now,
                ownerSignatureUrl: payload.signatureUrl,
                status: bothSigned ? AgreementStatus.SIGNED : AgreementStatus.SENT_FOR_SIGNATURE,
            },
        });
    } else {
        const bothSigned = agreement.signedByOwner;
        return prisma.rentAgreement.update({
            where: { leaseId },
            data: {
                signedByTenant: true,
                tenantSignedAt: now,
                tenantSignatureUrl: payload.signatureUrl,
                status: bothSigned ? AgreementStatus.SIGNED : AgreementStatus.SENT_FOR_SIGNATURE,
            },
        });
    }
};

export const RentAgreementService = {
    getAgreementByLease,
    createAgreement,
    signAgreement,
};
