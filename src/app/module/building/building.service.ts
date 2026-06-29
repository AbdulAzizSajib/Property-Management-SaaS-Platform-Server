import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    IAssignCaretakerPayload,
    ICreateBuildingPayload,
    IUpdateBuildingPayload,
} from "./building.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const ordinalFloorName = (n: number) => {
    const mod100 = n % 100;
    const mod10 = n % 10;
    let suffix = "th";
    if (mod100 < 11 || mod100 > 13) {
        if (mod10 === 1) suffix = "st";
        else if (mod10 === 2) suffix = "nd";
        else if (mod10 === 3) suffix = "rd";
    }
    return `${n}${suffix} Floor`;
};

const assertCaretakerBelongsToOrg = async (
    caretakerId: string,
    organizationId: string,
) => {
    const caretaker = await prisma.user.findFirst({
        where: {
            id: caretakerId,
            organizationId,
            role: Role.CARETAKER,
            isDeleted: false,
        },
    });
    if (!caretaker) {
        throw new AppError(
            status.BAD_REQUEST,
            "Caretaker not found in your organization",
        );
    }
};

const createBuilding = async (
    user: IRequestUser,
    payload: ICreateBuildingPayload,
) => {
    const organizationId = assertOrg(user);

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
    });

    if (!subscription) {
        throw new AppError(status.FORBIDDEN, "No active subscription");
    }

    const currentCount = await prisma.building.count({
        where: { organizationId },
    });

    if (currentCount >= subscription.buildingLimit) {
        throw new AppError(
            status.PAYMENT_REQUIRED,
            `Building limit reached (${subscription.buildingLimit}). Upgrade your plan to add more.`,
        );
    }

    if (payload.caretakerId) {
        await assertCaretakerBelongsToOrg(payload.caretakerId, organizationId);
    }

    const building = await prisma.$transaction(async (tx) => {
        const created = await tx.building.create({
            data: {
                ...payload,
                organizationId,
            },
        });

        if (payload.totalFloors && payload.totalFloors > 0) {
            await tx.floor.createMany({
                data: Array.from({ length: payload.totalFloors }, (_, i) => ({
                    buildingId: created.id,
                    floorNumber: i + 1,
                    name: ordinalFloorName(i + 1),
                })),
            });
        }

        return created;
    });

    return building;
};

const getAllBuildings = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const buildings = await prisma.building.findMany({
        where: { organizationId },
        include: {
            caretaker: { select: { id: true, name: true, email: true } },
            _count: { select: { floors: true, units: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return buildings;
};

const getBuildingById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const building = await prisma.building.findFirst({
        where: { id, organizationId },
        include: {
            caretaker: { select: { id: true, name: true, email: true } },
            floors: { orderBy: { floorNumber: "asc" } },
            units: true,
            managers: {
                include: {
                    manager: { select: { id: true, name: true, email: true } },
                },
            },
        },
    });

    if (!building) {
        throw new AppError(status.NOT_FOUND, "Building not found");
    }

    return building;
};

const updateBuilding = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateBuildingPayload,
) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.building.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Building not found");
    }

    return prisma.building.update({
        where: { id },
        data: payload,
    });
};

const deleteBuilding = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.building.findFirst({
        where: { id, organizationId },
        include: { units: { include: { leases: { where: { status: "ACTIVE" } } } } },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Building not found");
    }

    const hasActiveLeases = exists.units.some((u) => u.leases.length > 0);
    if (hasActiveLeases) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete building with active leases. Terminate leases first.",
        );
    }

    return prisma.building.delete({ where: { id } });
};

const assignCaretaker = async (
    user: IRequestUser,
    id: string,
    payload: IAssignCaretakerPayload,
) => {
    const organizationId = assertOrg(user);

    const building = await prisma.building.findFirst({
        where: { id, organizationId },
    });
    if (!building) {
        throw new AppError(status.NOT_FOUND, "Building not found");
    }

    if (payload.caretakerId) {
        await assertCaretakerBelongsToOrg(payload.caretakerId, organizationId);
    }

    return prisma.building.update({
        where: { id },
        data: { caretakerId: payload.caretakerId },
    });
};

export const BuildingService = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
    updateBuilding,
    deleteBuilding,
    assignCaretaker,
};
