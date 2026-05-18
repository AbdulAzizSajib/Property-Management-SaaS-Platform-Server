import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { TenantController } from "./tenant.controller";
import {
    createTenantZodSchema,
    updateTenantZodSchema,
} from "./tenant.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    validateRequest(createTenantZodSchema),
    TenantController.createTenant,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    TenantController.getAllTenants,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    TenantController.getTenantById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(updateTenantZodSchema),
    TenantController.updateTenant,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    TenantController.deleteTenant,
);

export const TenantRoutes = router;
