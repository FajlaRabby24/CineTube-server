import { Router } from "express";
import { SubscriptionController } from "../subscription/subscription.controller";

const router = Router();

router.post("/stripe", SubscriptionController.handleWebhook);

export const WebhookRoutes = router;
