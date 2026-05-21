import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateDocumentPayload, IDocumentQuery } from "./document.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const uploadDocument = async (
    user: IRequestUser,
    payload: ICreateDocumentPayload,
) => {
    const organizationId = assertOrg(user);

    return prisma.document.create({
        data: {
            name: payload.name,
            type: payload.type,
            fileUrl: payload.fileUrl,
            fileSize: payload.fileSize,
            mimeType: payload.mimeType,
            organizationId,
            tenantId: payload.tenantId,
            buildingId: payload.buildingId,
            leaseId: payload.leaseId,
            uploadedById: user.userId,
        },
        include: {
            building: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
            uploadedBy: { select: { id: true, name: true } },
        },
    });
};

const getAllDocuments = async (user: IRequestUser, query: IDocumentQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.DocumentWhereInput = { organizationId };
    if (query.type) where.type = query.type as never;
    if (query.buildingId) where.buildingId = query.buildingId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.leaseId) where.leaseId = query.leaseId;

    return prisma.document.findMany({
        where,
        include: {
            building: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
            uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
};

const getDocumentById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const doc = await prisma.document.findFirst({
        where: { id, organizationId },
        include: {
            building: true,
            tenant: true,
            uploadedBy: { select: { id: true, name: true, role: true } },
        },
    });

    if (!doc) {
        throw new AppError(status.NOT_FOUND, "Document not found");
    }

    return doc;
};

const deleteDocument = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.document.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Document not found");
    }

    return prisma.document.delete({ where: { id } });
};

export const DocumentService = {
    uploadDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
};
