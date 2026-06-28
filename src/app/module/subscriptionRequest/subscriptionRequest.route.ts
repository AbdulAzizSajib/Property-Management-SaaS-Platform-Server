import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubscriptionRequestController } from "./subscriptionRequest.controller";
import {
    approveSubscriptionRequestZodSchema,
    createSubscriptionRequestZodSchema,
    rejectSubscriptionRequestZodSchema,
} from "./subscriptionRequest.validation";

const router = Router();

// NOTE: these routes deliberately do NOT use requireActiveOrg — an owner whose
// subscription has expired must still be able to submit a payment to reactivate.

// Owner endpoints
router.get(
    "/payment-info",
    checkAuth(Role.OWNER, Role.MANAGER),
    SubscriptionRequestController.getPaymentInfo,
);

router.get(
    "/me",
    checkAuth(Role.OWNER, Role.MANAGER),
    SubscriptionRequestController.getMyRequests,
);

router.post(
    "/",
    checkAuth(Role.OWNER),
    validateRequest(createSubscriptionRequestZodSchema),
    SubscriptionRequestController.createRequest,
);

// Admin endpoints
router.get(
    "/all",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    SubscriptionRequestController.listRequests,
);

router.patch(
    "/:id/approve",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(approveSubscriptionRequestZodSchema),
    SubscriptionRequestController.approveRequest,
);

router.patch(
    "/:id/reject",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(rejectSubscriptionRequestZodSchema),
    SubscriptionRequestController.rejectRequest,
);

export const SubscriptionRequestRoutes = router;
