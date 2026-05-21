import status from "http-status";
import { ComplaintStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    IAssignComplaintPayload,
    IComplaintQuery,
    ICreateComplaintPayload,
    IUpdateComplaintPayload,
} from "./complaint.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const createComplaint = async (
    user: IRequestUser,
    payload: ICreateComplaintPayload,
) => {
    const organizationId = assertOrg(user);

    return prisma.complaint.create({
        data: {
            title: payload.title,
            description: payload.description,
            category: payload.category,
            priority: payload.priority,
            imageUrls: payload.imageUrls ?? [],
            organizationId,
            buildingId: payload.buildingId,
            unitId: payload.unitId,
            tenantId: payload.tenantId,
            createdById: user.userId,
        },
        include: {
            building: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
        },
    });
};

const getAllComplaints = async (user: IRequestUser, query: IComplaintQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.ComplaintWhereInput = { organizationId };
    if (query.buildingId) where.buildingId = query.buildingId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status as never;
    if (query.priority) where.priority = query.priority as never;

    return prisma.complaint.findMany({
        where,
        include: {
            building: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
};

const getComplaintById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const complaint = await prisma.complaint.findFirst({
        where: { id, organizationId },
        include: {
            building: true,
            unit: true,
            tenant: true,
            createdBy: { select: { id: true, name: true, role: true } },
            assignedTo: { select: { id: true, name: true, role: true } },
        },
    });

    if (!complaint) {
        throw new AppError(status.NOT_FOUND, "Complaint not found");
    }

    return complaint;
};

const updateComplaint = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateComplaintPayload,
) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.complaint.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Complaint not found");
    }

    const data: Prisma.ComplaintUpdateInput = { ...payload };

    if (payload.status === ComplaintStatus.RESOLVED && !exists.resolvedAt) {
        data.resolvedAt = new Date();
    }

    return prisma.complaint.update({ where: { id }, data });
};

const assignComplaint = async (
    user: IRequestUser,
    id: string,
    payload: IAssignComplaintPayload,
) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.complaint.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Complaint not found");
    }

    const assignee = await prisma.user.findFirst({
        where: { id: payload.assignedToId, organizationId, isDeleted: false },
    });
    if (!assignee) {
        throw new AppError(status.NOT_FOUND, "Assignee not found in your organization");
    }

    return prisma.complaint.update({
        where: { id },
        data: {
            assignedToId: payload.assignedToId,
            status: ComplaintStatus.ASSIGNED,
        },
        include: {
            assignedTo: { select: { id: true, name: true, role: true } },
        },
    });
};

const deleteComplaint = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const exists = await prisma.complaint.findFirst({
        where: { id, organizationId },
    });
    if (!exists) {
        throw new AppError(status.NOT_FOUND, "Complaint not found");
    }

    return prisma.complaint.delete({ where: { id } });
};

export const ComplaintService = {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    updateComplaint,
    assignComplaint,
    deleteComplaint,
};
