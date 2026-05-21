import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { ExpenseController } from "./expense.controller";
import { createExpenseZodSchema, updateExpenseZodSchema } from "./expense.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(createExpenseZodSchema),
    ExpenseController.createExpense,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    ExpenseController.getAllExpenses,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    ExpenseController.getExpenseById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(updateExpenseZodSchema),
    ExpenseController.updateExpense,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER),
    requireActiveOrg,
    ExpenseController.deleteExpense,
);

export const ExpenseRoutes = router;
