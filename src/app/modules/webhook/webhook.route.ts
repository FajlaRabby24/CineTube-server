import { Router } from "express";
import { SubscriptionController } from "../subscription/subscription.controller";

const router = Router();

router.post("/", SubscriptionController.handleWebhook);

export const WebhookRoutes = router;
