import z from "zod";
import { BuildingType } from "../../../generated/prisma/enums";

const buildingTypeEnum = z.enum(
    [
        BuildingType.RESIDENTIAL,
        BuildingType.COMMERCIAL,
        BuildingType.MIXED,
        BuildingType.HOSTEL,
        BuildingType.MESS,
    ],
    "Invalid building type",
);

export const createBuildingZodSchema = z.object({
    name: z.string().min(2).max(100),
    type: buildingTypeEnum.optional(),
    address: z.string().min(3).max(200),
    city: z.string().max(60).optional(),
    area: z.string().max(60).optional(),
    totalFloors: z.number().int().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.url().optional(),
    caretakerId: z.string().optional(),
});

export const updateBuildingZodSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    type: buildingTypeEnum.optional(),
    address: z.string().min(3).max(200).optional(),
    city: z.string().max(60).optional(),
    area: z.string().max(60).optional(),
    totalFloors: z.number().int().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.url().optional(),
    isActive: z.boolean().optional(),
});

export const assignCaretakerZodSchema = z.object({
    caretakerId: z.string().nullable(),
});
