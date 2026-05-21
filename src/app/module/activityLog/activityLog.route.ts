import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { ActivityLogController } from "./activityLog.controller";

const router = Router();

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ActivityLogController.getActivityLogs,
);

export const ActivityLogRoutes = router;
