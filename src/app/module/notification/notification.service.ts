import status from "http-status";
import { NotificationStatus } from "../../../generated/prisma/enums";
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

const getMyNotifications = async (
    user: IRequestUser,
    query: { status?: string; limit?: string },
) => {
    const organizationId = assertOrg(user);

    const where: Prisma.NotificationWhereInput = {
        organizationId,
        recipientUserId: user.userId,
    };

    if (query.status) where.status = query.status as never;

    return prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit ? parseInt(query.limit, 10) : 50,
    });
};

const markAsRead = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const notification = await prisma.notification.findFirst({
        where: { id, organizationId, recipientUserId: user.userId },
    });

    if (!notification) {
        throw new AppError(status.NOT_FOUND, "Notification not found");
    }

    return prisma.notification.update({
        where: { id },
        data: { status: NotificationStatus.READ },
    });
};

const markAllAsRead = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    const result = await prisma.notification.updateMany({
        where: {
            organizationId,
            recipientUserId: user.userId,
            status: { not: NotificationStatus.READ },
        },
        data: { status: NotificationStatus.READ },
    });

    return { updated: result.count };
};

export const NotificationService = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
};
