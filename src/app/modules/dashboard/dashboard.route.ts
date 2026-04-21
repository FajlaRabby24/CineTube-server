import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get(
  "/user-stats",
  checkAuth(Role.USER),
  DashboardController.getUserDashboardStats,
);

export const DashboardRoutes = router;
