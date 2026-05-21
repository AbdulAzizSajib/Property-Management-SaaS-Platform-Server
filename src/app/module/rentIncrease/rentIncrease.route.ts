import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { RentIncreaseController } from "./rentIncrease.controller";
import { createRentIncreaseZodSchema } from "./rentIncrease.validation";

const router = Router();

router.post(
    "/:leaseId",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(createRentIncreaseZodSchema),
    RentIncreaseController.createRentIncrease,
);

router.get(
    "/:leaseId",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    RentIncreaseController.getRentIncreasesByLease,
);

export const RentIncreaseRoutes = router;
