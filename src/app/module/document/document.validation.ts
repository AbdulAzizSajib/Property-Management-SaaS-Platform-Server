import z from "zod";
import { DocumentType } from "../../../generated/prisma/enums";

const documentTypeValues = Object.values(DocumentType) as [string, ...string[]];

export const createDocumentZodSchema = z.object({
    name: z.string().min(1).max(200),
    type: z.enum(documentTypeValues).optional(),
    tenantId: z.string().optional(),
    buildingId: z.string().optional(),
    leaseId: z.string().optional(),
});
