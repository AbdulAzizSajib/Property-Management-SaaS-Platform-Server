import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { TenantFormController } from "./tenantForm.controller";
import {
    createTenantFormZodSchema,
    updateTenantFormZodSchema,
} from "./tenantForm.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    validateRequest(createTenantFormZodSchema),
    TenantFormController.createTenantForm,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    TenantFormController.getAllTenantForms,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    TenantFormController.getTenantFormById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(updateTenantFormZodSchema),
    TenantFormController.updateTenantForm,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    TenantFormController.deleteTenantForm,
);

export const TenantFormRoutes = router;
