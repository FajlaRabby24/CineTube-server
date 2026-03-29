import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.get("/", checkAuth(), PaymentController.getUserPayments);

export const PaymentRoutes = router;
