import { Router } from "express";
import { WebhookController } from "./webhook.controller";

const router = Router();

router.post("/", WebhookController.handleWebhook);

export const WebhookRoutes = router;
