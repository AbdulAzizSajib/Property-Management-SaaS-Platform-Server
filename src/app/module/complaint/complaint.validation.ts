import z from "zod";
import {
    ComplaintCategory,
    ComplaintStatus,
    Priority,
} from "../../../generated/prisma/enums";

const complaintCategoryValues = Object.values(ComplaintCategory) as [string, ...string[]];
const complaintStatusValues = Object.values(ComplaintStatus) as [string, ...string[]];
const priorityValues = Object.values(Priority) as [string, ...string[]];

export const createComplaintZodSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    category: z.enum(complaintCategoryValues).optional(),
    priority: z.enum(priorityValues).optional(),
    imageUrls: z.array(z.url()).optional(),
    buildingId: z.string().optional(),
    unitId: z.string().optional(),
    tenantId: z.string().optional(),
});

export const updateComplaintZodSchema = z.object({
    status: z.enum(complaintStatusValues).optional(),
    resolutionNote: z.string().max(1000).optional(),
    priority: z.enum(priorityValues).optional(),
});

export const assignComplaintZodSchema = z.object({
    assignedToId: z.string().min(1),
});
