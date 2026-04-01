import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(authValidation.registerSchema),
  authController.register,
);
router.post(
  "/login",
  validateRequest(authValidation.loginSchema),
  authController.login,
);

router.get("/me", checkAuth(), authController.getMe);

router.patch(
  "/me",
  checkAuth(),
  validateRequest(authValidation.updateProfileSchema),
  authController.profileUpdate,
);

router.post(
  "/change-password",
  checkAuth(),
  validateRequest(authValidation.changePasswordSchema),
  authController.changePassword,
);

router.post(
  "/verify-email",
  validateRequest(authValidation.verifyEmailSchema),
  authController.verifyEmail,
);

router.post(
  "/forget-password",
  validateRequest(authValidation.forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordSchema),
  authController.resetPassword,
);

router.get("/sessions", checkAuth(), authController.getSessions);

router.delete(
  "/logout/all-sessions",
  checkAuth(),
  authController.logoutAllSession,
);

router.delete("/logout/:sessionId", checkAuth(), authController.logoutSession);

export const authRoute = router;
