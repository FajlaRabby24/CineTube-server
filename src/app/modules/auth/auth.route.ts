import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(authValidation.registerSchema),
  authController.register,
);

export const authRoute = router;
