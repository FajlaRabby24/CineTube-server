import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { ContactController } from "./contact.controller";
import { ContactValidation } from "./contact.validation";

const router = Router();

router.post(
  "/",
  validateRequest(ContactValidation.createContactMessageSchema),
  ContactController.createContactMessage,
);

export const ContactRoutes = router;
