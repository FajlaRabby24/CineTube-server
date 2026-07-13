import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ContactController } from "./contact.controller";
import { ContactValidation } from "./contact.validation";

const router = Router();

router.post(
  "/",
  validateRequest(ContactValidation.createContactMessageSchema),
  ContactController.createContactMessage,
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ContactController.getContactMessages,
);

export const ContactRoutes = router;
