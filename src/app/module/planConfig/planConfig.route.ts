import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PlanConfigController } from "./planConfig.controller";
import {
    createPlanConfigZodSchema,
    updatePlanConfigZodSchema,
} from "./planConfig.validation";

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

router.post(
    "/",
    checkAuth(Role.SUPER_ADMIN),
    validateRequest(createPlanConfigZodSchema),
    PlanConfigController.createPlanConfig,
);

router.patch(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    validateRequest(updatePlanConfigZodSchema),
    PlanConfigController.updatePlanConfig,
);

router.delete(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    PlanConfigController.deletePlanConfig,
);

export const PlanConfigRoutes = router;
