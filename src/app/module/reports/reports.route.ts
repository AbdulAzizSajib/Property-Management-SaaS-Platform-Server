import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { ReportsController } from "./reports.controller";

const router = Router();

router.get(
    "/financial",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ReportsController.getFinancialReport,
);

router.get(
    "/rent-collection",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ReportsController.getRentCollectionReport,
);

router.get(
    "/occupancy",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ReportsController.getOccupancyReport,
);

router.get(
    "/expenses",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ReportsController.getExpenseReport,
);

export const ReportsRoutes = router;
