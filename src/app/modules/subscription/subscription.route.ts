import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionValidation } from "./subscription.validation";

const router = Router();

router.get("/", checkAuth(), SubscriptionController.getUserSubscription);

router.post(
  "/create-checkout-session",
  checkAuth(),
  validateRequest(SubscriptionValidation.checkoutSchema),
  SubscriptionController.createCheckout,
);

router.post("/cancel", checkAuth(), SubscriptionController.cancelSubscription);

router.post(
  "/create-customer-portal",
  checkAuth(),
  SubscriptionController.createCustomerPortal,
);

export const SubscriptionRoutes = router;
