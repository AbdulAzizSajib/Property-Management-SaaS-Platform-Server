import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { LeaseController } from "./lease.controller";
import {
    createLeaseZodSchema,
    terminateLeaseZodSchema,
} from "./lease.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(createLeaseZodSchema),
    LeaseController.createLease,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    LeaseController.getAllLeases,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    LeaseController.getLeaseById,
);

router.patch(
    "/:id/terminate",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(terminateLeaseZodSchema),
    LeaseController.terminateLease,
);

export const LeaseRoutes = router;
