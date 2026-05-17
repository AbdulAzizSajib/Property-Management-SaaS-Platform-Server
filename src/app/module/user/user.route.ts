import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import {
    createStaffZodSchema,
    createTenantZodSchema,
    updateUserZodSchema,
} from "./user.validation";

const router = Router();

router.post(
    "/create-staff",
    checkAuth(Role.OWNER, Role.SUPER_ADMIN),
    validateRequest(createStaffZodSchema),
    UserController.createStaff,
);

router.post(
    "/create-tenant",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    validateRequest(createTenantZodSchema),
    UserController.createTenant,
);

router.get(
    "/",
    checkAuth(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER),
    UserController.getAllUsers,
);

router.get(
    "/:id",
    checkAuth(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER),
    UserController.getUserById,
);

router.patch(
    "/:id",
    checkAuth(Role.SUPER_ADMIN, Role.OWNER),
    validateRequest(updateUserZodSchema),
    UserController.updateUser,
);

router.delete(
    "/:id",
    checkAuth(Role.SUPER_ADMIN, Role.OWNER),
    UserController.softDeleteUser,
);

export const UserRoutes = router;
