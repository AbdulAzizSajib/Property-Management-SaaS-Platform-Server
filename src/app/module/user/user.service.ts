import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateStaffPayload, ICreateTenantPayload } from "./user.interface";

const createStaff = async (
    payload: ICreateStaffPayload,
    creator: IRequestUser,
) => {
    if (!creator.organizationId) {
        throw new AppError(
            status.FORBIDDEN,
            "You must belong to an organization to create staff",
        );
    }

    const organizationId = creator.organizationId;

    const userExists = await prisma.user.findUnique({
        where: { email: payload.user.email },
    });

    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    if (payload.role === Role.CARETAKER && payload.buildingIds?.length) {
        if (payload.buildingIds.length > 1) {
            throw new AppError(
                status.BAD_REQUEST,
                "A caretaker can only be assigned to one building",
            );
        }
    }

    if (payload.buildingIds?.length) {
        const buildings = await prisma.building.findMany({
            where: {
                id: { in: payload.buildingIds },
                organizationId,
            },
            select: { id: true },
        });

        if (buildings.length !== payload.buildingIds.length) {
            throw new AppError(
                status.BAD_REQUEST,
                "One or more buildings not found in your organization",
            );
        }
    }

    const userData = await auth.api.signUpEmail({
        body: {
            email: payload.user.email,
            password: payload.password,
            name: payload.user.name,
            role: payload.role,
            contactNumber: payload.user.contactNumber,
            needPasswordChange: true,
        },
    });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: userData.user.id },
                data: {
                    organizationId,
                    image: payload.user.image,
                },
            });

            if (payload.buildingIds?.length) {
                if (payload.role === Role.MANAGER) {
                    await tx.buildingManager.createMany({
                        data: payload.buildingIds.map((buildingId) => ({
                            buildingId,
                            managerId: updatedUser.id,
                        })),
                    });
                } else if (payload.role === Role.CARETAKER) {
                    await tx.building.update({
                        where: { id: payload.buildingIds[0] },
                        data: { caretakerId: updatedUser.id },
                    });
                }
            }

            return updatedUser;
        });

        return result;
    } catch (error) {
        await prisma.user.delete({ where: { id: userData.user.id } });
        throw error;
    }
};

const createTenant = async (
    payload: ICreateTenantPayload,
    creator: IRequestUser,
) => {
    if (!creator.organizationId) {
        throw new AppError(
            status.FORBIDDEN,
            "You must belong to an organization to create tenants",
        );
    }

    const organizationId = creator.organizationId;

    if (payload.createLoginAccount && !payload.password) {
        throw new AppError(
            status.BAD_REQUEST,
            "Password is required when creating a login account",
        );
    }

    if (payload.createLoginAccount && !payload.tenant.email) {
        throw new AppError(
            status.BAD_REQUEST,
            "Email is required when creating a login account",
        );
    }

    let userId: string | null = null;

    if (payload.createLoginAccount && payload.tenant.email && payload.password) {
        const existingUser = await prisma.user.findUnique({
            where: { email: payload.tenant.email },
        });

        if (existingUser) {
            throw new AppError(
                status.CONFLICT,
                "User with this email already exists",
            );
        }

        const userData = await auth.api.signUpEmail({
            body: {
                email: payload.tenant.email,
                password: payload.password,
                name: payload.tenant.name,
                role: Role.TENANT,
                contactNumber: payload.tenant.phone,
                needPasswordChange: true,
            },
        });

        await prisma.user.update({
            where: { id: userData.user.id },
            data: { organizationId },
        });

        userId = userData.user.id;
    }

    try {
        const tenant = await prisma.tenant.create({
            data: {
                ...payload.tenant,
                organizationId,
                userId,
            },
            include: { user: true },
        });

        return tenant;
    } catch (error) {
        if (userId) {
            await prisma.user.delete({ where: { id: userId } });
        }
        throw error;
    }
};

const getAllUsers = async (creator: IRequestUser) => {
    if (creator.role === Role.SUPER_ADMIN) {
        return prisma.user.findMany({
            where: { isDeleted: false },
            include: { organization: true },
            orderBy: { createdAt: "desc" },
        });
    }

    if (!creator.organizationId) {
        throw new AppError(status.FORBIDDEN, "You do not belong to an organization");
    }

    return prisma.user.findMany({
        where: {
            organizationId: creator.organizationId,
            isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
    });
};

const getUserById = async (id: string, requester: IRequestUser) => {
    const user = await prisma.user.findUnique({
        where: { id },
        include: { organization: true, tenantProfile: true },
    });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (
        requester.role !== Role.SUPER_ADMIN &&
        user.organizationId !== requester.organizationId
    ) {
        throw new AppError(status.FORBIDDEN, "Access denied");
    }

    return user;
};

const updateUser = async (
    id: string,
    payload: Partial<{
        name: string;
        contactNumber: string;
        image: string;
        isActive: boolean;
    }>,
    requester: IRequestUser,
) => {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (
        requester.role !== Role.SUPER_ADMIN &&
        user.organizationId !== requester.organizationId
    ) {
        throw new AppError(status.FORBIDDEN, "Access denied");
    }

    return prisma.user.update({ where: { id }, data: payload });
};

const softDeleteUser = async (id: string, requester: IRequestUser) => {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (
        requester.role !== Role.SUPER_ADMIN &&
        user.organizationId !== requester.organizationId
    ) {
        throw new AppError(status.FORBIDDEN, "Access denied");
    }

    if (user.id === requester.userId) {
        throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
    }

    return prisma.user.update({
        where: { id },
        data: {
            isDeleted: true,
            isActive: false,
            deletedAt: new Date(),
        },
    });
};

export const UserService = {
    createStaff,
    createTenant,
    getAllUsers,
    getUserById,
    updateUser,
    softDeleteUser,
};
