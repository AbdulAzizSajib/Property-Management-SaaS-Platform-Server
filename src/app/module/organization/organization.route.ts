import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { OrganizationController } from "./organization.controller";
import { updateOrganizationZodSchema } from "./organization.validation";

const router = Router();

router.get(
    "/me",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    OrganizationController.getMyOrganization,
);

router.patch(
    "/me",
    checkAuth(Role.OWNER),
    validateRequest(updateOrganizationZodSchema),
    OrganizationController.updateMyOrganization,
);

export const OrganizationRoutes = router;
