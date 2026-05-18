import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import {
    ICreateTenantPayload,
    IUpdateTenantPayload,
} from "./tenant.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const createTenant = async (
    user: IRequestUser,
    payload: ICreateTenantPayload,
) => {
    const organizationId = assertOrg(user);

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
    });
    if (!subscription) {
        throw new AppError(status.FORBIDDEN, "No active subscription");
    }

    const currentCount = await prisma.tenant.count({
        where: { organizationId },
    });
    if (currentCount >= subscription.tenantLimit) {
        throw new AppError(
            status.PAYMENT_REQUIRED,
            `Tenant limit reached (${subscription.tenantLimit}). Upgrade your plan to add more.`,
        );
    }

    let linkedUserId: string | undefined;

    if (payload.createLoginAccount) {
        if (!payload.email) {
            throw new AppError(
                status.BAD_REQUEST,
                "Email is required to create a login account",
            );
        }
        if (!payload.password) {
            throw new AppError(
                status.BAD_REQUEST,
                "Password is required to create a login account",
            );
        }

        const userExists = await prisma.user.findUnique({
            where: { email: payload.email },
        });
        if (userExists) {
            throw new AppError(
                status.CONFLICT,
                "A user with this email already exists",
            );
        }

        const signUp = await auth.api.signUpEmail({
            body: {
                name: payload.name,
                email: payload.email,
                password: payload.password,
            },
        });

        await prisma.user.update({
            where: { id: signUp.user.id },
            data: {
                organizationId,
                role: Role.TENANT,
                contactNumber: payload.phone,
            },
        });

        linkedUserId = signUp.user.id;
    }

    return prisma.tenant.create({
        data: {
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            nidNumber: payload.nidNumber,
            emergencyContact: payload.emergencyContact,
            emergencyName: payload.emergencyName,
            occupation: payload.occupation,
            permanentAddress: payload.permanentAddress,
            photoUrl: payload.photoUrl,
            organizationId,
            userId: linkedUserId,
        },
    });
};

const getAllTenants = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    return prisma.tenant.findMany({
        where: { organizationId },
        include: {
            leases: {
                where: { status: "ACTIVE" },
                include: {
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
        orderBy: { createdAt: "desc" },
    });
};

const getTenantById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const tenant = await prisma.tenant.findFirst({
        where: { id, organizationId },
        include: {
            user: { select: { id: true, email: true, role: true } },
            leases: { include: { unit: true } },
        },
    });

    if (!tenant) {
        throw new AppError(status.NOT_FOUND, "Tenant not found");
    }

    return tenant;
};

const updateTenant = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateTenantPayload,
) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.tenant.findFirst({
        where: { id, organizationId },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Tenant not found");
    }

    return prisma.tenant.update({ where: { id }, data: payload });
};

const deleteTenant = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.tenant.findFirst({
        where: { id, organizationId },
        include: { leases: { where: { status: "ACTIVE" } } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Tenant not found");
    }
    if (existing.leases.length > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete tenant with active lease. Terminate lease first.",
        );
    }

    return prisma.tenant.update({
        where: { id },
        data: { isActive: false },
    });
};

export const TenantService = {
    createTenant,
    getAllTenants,
    getTenantById,
    updateTenant,
    deleteTenant,
};
