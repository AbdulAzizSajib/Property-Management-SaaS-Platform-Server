import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubscriptionController } from "./subscription.controller";
import { changePlanZodSchema } from "./subscription.validation";

const router = Router();

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

export const SubscriptionRoutes = router;
