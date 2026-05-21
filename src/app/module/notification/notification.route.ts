import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const router = Router();

const ALL_ROLES = [Role.OWNER, Role.MANAGER, Role.CARETAKER, Role.TENANT];

router.get(
    "/",
    checkAuth(...ALL_ROLES),
    NotificationController.getMyNotifications,
);

router.patch(
    "/read-all",
    checkAuth(...ALL_ROLES),
    NotificationController.markAllAsRead,
);

router.patch(
    "/:id/read",
    checkAuth(...ALL_ROLES),
    NotificationController.markAsRead,
);

export const NotificationRoutes = router;
