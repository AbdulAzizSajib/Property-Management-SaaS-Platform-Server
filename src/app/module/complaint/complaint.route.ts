import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { ComplaintController } from "./complaint.controller";
import {
    assignComplaintZodSchema,
    createComplaintZodSchema,
    updateComplaintZodSchema,
} from "./complaint.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER, Role.TENANT),
    requireActiveOrg,
    validateRequest(createComplaintZodSchema),
    ComplaintController.createComplaint,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    ComplaintController.getAllComplaints,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    ComplaintController.getComplaintById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    validateRequest(updateComplaintZodSchema),
    ComplaintController.updateComplaint,
);

router.patch(
    "/:id/assign",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(assignComplaintZodSchema),
    ComplaintController.assignComplaint,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    ComplaintController.deleteComplaint,
);

export const ComplaintRoutes = router;
