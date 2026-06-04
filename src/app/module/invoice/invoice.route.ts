import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { validateRequest } from "../../middleware/validateRequest";
import { InvoiceController } from "./invoice.controller";
import {
    cancelInvoiceZodSchema,
    generateInvoiceZodSchema,
    generateMonthlyZodSchema,
    updateInvoiceZodSchema,
} from "./invoice.validation";

const router = Router();

router.post(
    "/generate",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(generateInvoiceZodSchema),
    InvoiceController.generateOne,
);

router.post(
    "/generate-monthly",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(generateMonthlyZodSchema),
    InvoiceController.generateMonthlyBatch,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    InvoiceController.getAllInvoices,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    InvoiceController.getInvoiceById,
);

router.patch(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(updateInvoiceZodSchema),
    InvoiceController.updateInvoice,
);

router.post(
    "/:id/cancel",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    validateRequest(cancelInvoiceZodSchema),
    InvoiceController.cancelInvoice,
);

router.delete(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    InvoiceController.deleteInvoice,
);

export const InvoiceRoutes = router;
