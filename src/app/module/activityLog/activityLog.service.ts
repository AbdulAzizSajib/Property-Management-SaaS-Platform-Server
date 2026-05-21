import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

export interface IActivityLogQuery {
    userId?: string;
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: string;
}

const getActivityLogs = async (user: IRequestUser, query: IActivityLogQuery) => {
    const organizationId = assertOrg(user);

    const where: Prisma.ActivityLogWhereInput = { organizationId };
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = { contains: query.action, mode: "insensitive" };
    if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) where.createdAt.gte = new Date(query.from);
        if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return prisma.activityLog.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: query.limit ? parseInt(query.limit, 10) : 100,
    });
};

export const logActivity = async (data: {
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: object;
    ipAddress?: string;
    organizationId?: string;
    userId?: string;
}) => {
    return prisma.activityLog.create({
        data: {
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            metadata: data.metadata ?? Prisma.JsonNull,
            ipAddress: data.ipAddress,
            organizationId: data.organizationId,
            userId: data.userId,
        },
    });
};

export const ActivityLogService = { getActivityLogs };
