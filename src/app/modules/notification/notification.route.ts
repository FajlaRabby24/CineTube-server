import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get("/", checkAuth(), NotificationController.getUserNotifications);

router.patch("/read-all", checkAuth(), NotificationController.markAllAsRead);

router.patch("/:id/read", checkAuth(), NotificationController.markAsRead);

export const NotificationRoutes = router;
