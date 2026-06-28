import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get(
    "/summary",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    DashboardController.getSummary,
);

router.get(
    "/occupancy",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    DashboardController.getOccupancy,
);

router.get(
    "/overview",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    DashboardController.getOverview,
);

export const DashboardRoutes = router;
