import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { UnitStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateUnitPayload,
    IUnitQuery,
    IUpdateUnitPayload,
} from "./unit.interface";

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
    const b = await prisma.building.findFirst({
        where: { id: buildingId, organizationId },
    });
    if (!b) {
        throw new AppError(
            status.NOT_FOUND,
            "Building not found in your organization",
        );
    }
    return b;
};

const assertFloorInBuilding = async (
    floorId: string,
    buildingId: string,
) => {
    const floor = await prisma.floor.findFirst({
        where: { id: floorId, buildingId },
    });
    if (!floor) {
        throw new AppError(
            status.BAD_REQUEST,
            "Floor not found in this building",
        );
    }
};

const createUnit = async (
    user: IRequestUser,
    payload: ICreateUnitPayload,
) => {
    const organizationId = assertOrg(user);
    await assertBuildingInOrg(payload.buildingId, organizationId);

    if (payload.floorId) {
        await assertFloorInBuilding(payload.floorId, payload.buildingId);
    }

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
    });
    if (!subscription) {
        throw new AppError(status.FORBIDDEN, "No active subscription");
    }

    const currentCount = await prisma.unit.count({
        where: { building: { organizationId } },
    });

    if (currentCount >= subscription.unitLimit) {
        throw new AppError(
            status.PAYMENT_REQUIRED,
            `Unit limit reached (${subscription.unitLimit}). Upgrade your plan to add more.`,
        );
    }

    return prisma.unit.create({
        data: {
            ...payload,
            baseRent: new Prisma.Decimal(payload.baseRent),
            serviceCharge:
                payload.serviceCharge !== undefined
                    ? new Prisma.Decimal(payload.serviceCharge)
                    : undefined,
        },
    });
};

const getAllUnits = async (user: IRequestUser, query: IUnitQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.UnitWhereInput = {
        building: { organizationId },
    };
    if (query.buildingId) where.buildingId = query.buildingId;
    if (query.floorId) where.floorId = query.floorId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    return prisma.unit.findMany({
        where,
        include: {
            building: { select: { id: true, name: true } },
            floor: { select: { id: true, name: true, floorNumber: true } },
            leases: {
                where: { status: "ACTIVE" },
                include: {
                    tenant: { select: { id: true, name: true, phone: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

const getUnitById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const unit = await prisma.unit.findFirst({
        where: { id, building: { organizationId } },
        include: {
            building: true,
            floor: true,
            leases: {
                include: { tenant: true },
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!unit) {
        throw new AppError(status.NOT_FOUND, "Unit not found");
    }

    return unit;
};

const updateUnit = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateUnitPayload,
) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.unit.findFirst({
        where: { id, building: { organizationId } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Unit not found");
    }

    if (payload.floorId) {
        await assertFloorInBuilding(payload.floorId, existing.buildingId);
    }

    const data: Prisma.UnitUpdateInput = { ...payload };
    if (payload.baseRent !== undefined) {
        data.baseRent = new Prisma.Decimal(payload.baseRent);
    }
    if (payload.serviceCharge !== undefined) {
        data.serviceCharge = new Prisma.Decimal(payload.serviceCharge);
    }
    if (payload.floorId !== undefined) {
        data.floor = { connect: { id: payload.floorId } };
        delete (data as Prisma.UnitUpdateInput & { floorId?: string }).floorId;
    }

    return prisma.unit.update({ where: { id }, data });
};

const deleteUnit = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.unit.findFirst({
        where: { id, building: { organizationId } },
        include: { leases: { where: { status: "ACTIVE" } } },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Unit not found");
    }

    if (existing.leases.length > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Cannot delete unit with active lease. Terminate lease first.",
        );
    }

    return prisma.unit.delete({ where: { id } });
};

// Used by lease module (no controller exposure)
const markUnitStatus = async (
    tx: Prisma.TransactionClient,
    unitId: string,
    newStatus: UnitStatus,
) => {
    return tx.unit.update({ where: { id: unitId }, data: { status: newStatus } });
};

export const UnitService = {
    createUnit,
    getAllUnits,
    getUnitById,
    updateUnit,
    deleteUnit,
    markUnitStatus,
};
