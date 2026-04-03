import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PricingController } from "./pricing.controller";
import { PricingValidation } from "./pricing.validation";

const router = Router();

router.get("/", PricingController.getAllPricingPlans);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PricingValidation.createPricingPlanSchema),
  PricingController.createPricingPlan,
);

router.patch(
  "/:pricingId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PricingValidation.updatePricingPlanSchema),
  PricingController.updatePricingPlan,
);

export const PricingRoutes = router;
