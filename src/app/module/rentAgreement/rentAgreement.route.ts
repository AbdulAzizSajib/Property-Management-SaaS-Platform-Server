import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { RentAgreementController } from "./rentAgreement.controller";
import {
    createRentAgreementZodSchema,
    signRentAgreementZodSchema,
} from "./rentAgreement.validation";

const router = Router();

router.get(
    "/:leaseId",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    RentAgreementController.getAgreementByLease,
);

router.post(
    "/:leaseId",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(createRentAgreementZodSchema),
    RentAgreementController.createAgreement,
);

router.patch(
    "/:leaseId/sign",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(signRentAgreementZodSchema),
    RentAgreementController.signAgreement,
);

export const RentAgreementRoutes = router;
