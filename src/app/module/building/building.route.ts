import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { BuildingController } from "./building.controller";
import {
    assignCaretakerZodSchema,
    createBuildingZodSchema,
    updateBuildingZodSchema,
} from "./building.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER),
    requireActiveOrg,
    validateRequest(createBuildingZodSchema),
    BuildingController.createBuilding,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    BuildingController.getAllBuildings,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    BuildingController.getBuildingById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER),
    requireActiveOrg,
    validateRequest(updateBuildingZodSchema),
    BuildingController.updateBuilding,
);

router.patch(
    "/:id/assign-caretaker",
    checkAuth(Role.OWNER),
    requireActiveOrg,
    validateRequest(assignCaretakerZodSchema),
    BuildingController.assignCaretaker,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER),
    requireActiveOrg,
    BuildingController.deleteBuilding,
);

export const BuildingRoutes = router;
