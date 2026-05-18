import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { IUpdateOrganizationPayload } from "./organization.interface";

const getMyOrganization = async (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(
            status.BAD_REQUEST,
            "User is not associated with any organization",
        );
    }

    const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: { subscription: true },
    });

    if (!organization) {
        throw new AppError(status.NOT_FOUND, "Organization not found");
    }

    return organization;
};

const updateMyOrganization = async (
    user: IRequestUser,
    payload: IUpdateOrganizationPayload,
) => {
    if (!user.organizationId) {
        throw new AppError(
            status.BAD_REQUEST,
            "User is not associated with any organization",
        );
    }

    const updated = await prisma.organization.update({
        where: { id: user.organizationId },
        data: payload,
    });

    return updated;
};

export const OrganizationService = {
    getMyOrganization,
    updateMyOrganization,
};
