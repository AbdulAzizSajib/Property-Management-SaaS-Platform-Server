import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubscriptionController } from "./subscription.controller";
import {
    adminUpdateSubscriptionZodSchema,
    changePlanZodSchema,
} from "./subscription.validation";

const router = Router();

// Public — pricing page
router.get("/plans", SubscriptionController.getAllPlans);

// Owner endpoints
router.get(
    "/me",
    checkAuth(Role.OWNER, Role.MANAGER),
    SubscriptionController.getMySubscription,
);

router.patch(
    "/me/plan",
    checkAuth(Role.OWNER),
    validateRequest(changePlanZodSchema),
    SubscriptionController.changePlan,
);

router.post(
    "/me/cancel",
    checkAuth(Role.OWNER),
    SubscriptionController.cancelSubscription,
);

router.post(
    "/me/reactivate",
    checkAuth(Role.OWNER),
    SubscriptionController.reactivateSubscription,
);

// Super admin endpoints
router.get(
    "/",
    checkAuth(Role.SUPER_ADMIN),
    SubscriptionController.listAllSubscriptions,
);

router.patch(
    "/:organizationId",
    checkAuth(Role.SUPER_ADMIN),
    validateRequest(adminUpdateSubscriptionZodSchema),
    SubscriptionController.adminUpdateSubscription,
);

export const SubscriptionRoutes = router;
