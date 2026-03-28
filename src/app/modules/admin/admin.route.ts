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

export const AdminRoutes = router;
