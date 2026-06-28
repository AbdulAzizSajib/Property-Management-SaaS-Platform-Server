import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PlanConfigController } from "./planConfig.controller";
import { updatePlanConfigZodSchema } from "./planConfig.validation";

const router = Router();

router.get(
    "/",
    checkAuth(Role.SUPER_ADMIN),
    PlanConfigController.getAllPlanConfigs,
);

router.get(
    "/by-plan/:plan",
    checkAuth(Role.SUPER_ADMIN),
    PlanConfigController.getPlanConfigByPlan,
);

router.get(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    PlanConfigController.getPlanConfigById,
);

// Plans are enum-bound (FREE/BASIC/STANDARD/BUSINESS) and seeded once on a
// fresh DB, so there is no create/delete — only edit price/limits/features.
router.patch(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    validateRequest(updatePlanConfigZodSchema),
    PlanConfigController.updatePlanConfig,
);

export const PlanConfigRoutes = router;
