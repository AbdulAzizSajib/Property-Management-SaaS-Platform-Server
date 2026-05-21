import { DocumentType } from "../../../generated/prisma/enums";

export interface ICreateDocumentPayload {
    name: string;
    type?: DocumentType;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    tenantId?: string;
    buildingId?: string;
    leaseId?: string;
}

export interface IDocumentQuery {
    type?: string;
    buildingId?: string;
    tenantId?: string;
    leaseId?: string;
}
