import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { multerUpload } from "../../config/multer.config";
import { checkAuth } from "../../middleware/checkAuth";
import { requireActiveOrg } from "../../middleware/requireActiveOrg";
import { DocumentController } from "./document.controller";

const router = Router();

router.post(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    multerUpload.single("file"),
    DocumentController.uploadDocument,
);

router.get(
    "/",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    DocumentController.getAllDocuments,
);

router.get(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER, Role.CARETAKER),
    requireActiveOrg,
    DocumentController.getDocumentById,
);

router.delete(
    "/:id",
    checkAuth(Role.OWNER, Role.MANAGER),
    requireActiveOrg,
    DocumentController.deleteDocument,
);

export const DocumentRoutes = router;
