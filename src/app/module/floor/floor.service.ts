import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateFloorPayload,
    IUpdateFloorPayload,
} from "./floor.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const assertBuildingInOrg = async (
    buildingId: string,
    organizationId: string,
) => {
    const building = await prisma.building.findFirst({
        where: { id: buildingId, organizationId },
    });
    if (!building) {
        throw new AppError(
            status.NOT_FOUND,
            "Building not found in your organization",
        );
    }
    return building;
};

const createFloor = async (
    user: IRequestUser,
    payload: ICreateFloorPayload,
) => {
    const organizationId = assertOrg(user);
    await assertBuildingInOrg(payload.buildingId, organizationId);

    const duplicate = await prisma.floor.findFirst({
        where: {
            buildingId: payload.buildingId,
            floorNumber: payload.floorNumber,
        },
    });
    if (duplicate) {
        throw new AppError(
            status.CONFLICT,
            `Floor number ${payload.floorNumber} already exists in this building`,
        );
    }

    return prisma.floor.create({ data: payload });
};

const getFloorsByBuilding = async (
    user: IRequestUser,
    buildingId: string,
) => {
    const organizationId = assertOrg(user);
    await assertBuildingInOrg(buildingId, organizationId);

    return prisma.floor.findMany({
        where: { buildingId },
        include: { _count: { select: { units: true } } },
        orderBy: { floorNumber: "asc" },
    });
};

const getFloorById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const floor = await prisma.floor.findFirst({
        where: { id, building: { organizationId } },
        include: { units: true },
    });

    if (!floor) {
        throw new AppError(status.NOT_FOUND, "Floor not found");
    }

    return floor;
};

const updateFloor = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateFloorPayload,
) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.floor.findFirst({
        where: { id, building: { organizationId } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Floor not found");
    }

    if (
        payload.floorNumber !== undefined &&
        payload.floorNumber !== existing.floorNumber
    ) {
        const duplicate = await prisma.floor.findFirst({
            where: {
                buildingId: existing.buildingId,
                floorNumber: payload.floorNumber,
            },
        });
        if (duplicate) {
            throw new AppError(
                status.CONFLICT,
                `Floor number ${payload.floorNumber} already exists in this building`,
            );
        }
    }

    return prisma.floor.update({ where: { id }, data: payload });
};

const deleteFloor = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.floor.findFirst({
        where: { id, building: { organizationId } },
        include: { units: true },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Floor not found");
    }

    if (existing.units.length > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete floor with units. Delete or reassign units first.",
        );
    }

    return prisma.floor.delete({ where: { id } });
};

export const FloorService = {
    createFloor,
    getFloorsByBuilding,
    getFloorById,
    updateFloor,
    deleteFloor,
};
