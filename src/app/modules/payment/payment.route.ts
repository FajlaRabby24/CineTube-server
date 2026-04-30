import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.get("/", checkAuth(), PaymentController.getUserPayments);

router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.getAllPayments,
);

export const PaymentRoutes = router;
