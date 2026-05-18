import z from "zod";

export const createFloorZodSchema = z.object({
    buildingId: z.string().min(1),
    name: z.string().min(1).max(50),
    floorNumber: z.number().int().min(-5).max(200),
});

export const updateFloorZodSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    floorNumber: z.number().int().min(-5).max(200).optional(),
});
