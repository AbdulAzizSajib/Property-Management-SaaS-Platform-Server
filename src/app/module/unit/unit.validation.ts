import z from "zod";
import { UnitStatus, UnitType } from "../../../generated/prisma/enums";

const unitTypeEnum = z.enum(
    [
        UnitType.FLAT,
        UnitType.SHOP,
        UnitType.OFFICE,
        UnitType.ROOM,
        UnitType.GARAGE,
        UnitType.WAREHOUSE,
    ],
    "Invalid unit type",
);

const unitStatusEnum = z.enum(
    [
        UnitStatus.OCCUPIED,
        UnitStatus.VACANT,
        UnitStatus.UNDER_MAINTENANCE,
        UnitStatus.RESERVED,
    ],
    "Invalid unit status",
);

const roomCount = z.number().int().min(0).max(20);

export const createUnitZodSchema = z.object({
    buildingId: z.string().min(1),
    floorId: z.string().optional(),
    name: z.string().min(1).max(50),
    type: unitTypeEnum.optional(),
    bedrooms: roomCount.optional(),
    bathrooms: roomCount.optional(),
    drawingRooms: roomCount.optional(),
    diningRooms: roomCount.optional(),
    kitchens: roomCount.optional(),
    balconies: roomCount.optional(),
    sizeSqft: z.number().min(0).optional(),
    baseRent: z.number().min(0),
    serviceCharge: z.number().min(0).optional(),
    description: z.string().max(500).optional(),
});

export const updateUnitZodSchema = z.object({
    floorId: z.string().optional(),
    name: z.string().min(1).max(50).optional(),
    type: unitTypeEnum.optional(),
    status: unitStatusEnum.optional(),
    bedrooms: roomCount.optional(),
    bathrooms: roomCount.optional(),
    drawingRooms: roomCount.optional(),
    diningRooms: roomCount.optional(),
    kitchens: roomCount.optional(),
    balconies: roomCount.optional(),
    sizeSqft: z.number().min(0).optional(),
    baseRent: z.number().min(0).optional(),
    serviceCharge: z.number().min(0).optional(),
    description: z.string().max(500).optional(),
});
