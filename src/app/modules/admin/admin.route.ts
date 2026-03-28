import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(AdminValidation.createAdminSchema),
  AdminController.createAdmin,
);

router.get(
  "/stats",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getDashboardStats,
);

router.get(
  "/users",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllUsers,
);

router.patch(
  "/users/:id/ban",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(AdminValidation.banUserSchema),
  AdminController.banUnbanUser,
);

router.get(
  "/audit-log",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAuditLogs,
);

router.get(
  "/payments",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getPaymentAnalytics,
);

router.post(
  "/payments/:id/refund",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(AdminValidation.refundPaymentSchema),
  AdminController.refundPayment,
);

export const AdminRoutes = router;
