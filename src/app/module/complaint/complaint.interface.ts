import { ComplaintCategory, ComplaintStatus, Priority } from "../../../generated/prisma/enums";

export interface ICreateComplaintPayload {
    title: string;
    description: string;
    category?: ComplaintCategory;
    priority?: Priority;
    imageUrls?: string[];
    buildingId?: string;
    unitId?: string;
    tenantId?: string;
}

export interface IUpdateComplaintPayload {
    status?: ComplaintStatus;
    resolutionNote?: string;
    priority?: Priority;
}

export interface IAssignComplaintPayload {
    assignedToId: string;
}

export interface IComplaintQuery {
    buildingId?: string;
    unitId?: string;
    status?: string;
    priority?: string;
    tenantId?: string;
}
