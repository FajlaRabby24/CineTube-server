import { Router } from "express";
import status from "http-status";
import { AdminRoutes } from "../modules/admin/admin.route";
import { authRoute } from "../modules/auth/auth.route";
import { CommentRoutes } from "../modules/comment/comment.route";
import { DashboardRoutes } from "../modules/dashboard/dashboard.route";
import { MediaRoutes } from "../modules/media/media.route";
import { NotificationRoutes } from "../modules/notification/notification.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { PricingRoutes } from "../modules/pricing/pricing.route";
import { ReportRoutes } from "../modules/report/report.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";
import { TagRoutes } from "../modules/tag/tag.route";
import { WatchlistRoutes } from "../modules/watchlist/watchlist.route";
import { ContactRoutes } from "../modules/contact/contact.route";
import { sendResponse } from "../utils/sendResponse";

const router = Router();

router.use("/auth", authRoute);
router.use("/admin", AdminRoutes);
router.use("/media", MediaRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/comments", CommentRoutes);
router.use("/watchlist", WatchlistRoutes);
router.use("/tags", TagRoutes);
router.use("/reports", ReportRoutes);
router.use("/notifications", NotificationRoutes);
router.use("/payments", PaymentRoutes);
router.use("/pricing", PricingRoutes);
router.use("/subscriptions", SubscriptionRoutes);
router.use("/dashboard", DashboardRoutes);
router.use("/contact", ContactRoutes);

router.post("/validate-file", async (req, res) => {
  const { name, size, type } = req.body;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!name || !size || !type) {
    return sendResponse(res, status.BAD_REQUEST, false, "Missing file info");
  }

  if (!allowedTypes.includes(type)) {
    return sendResponse(
      res,
      status.BAD_REQUEST,
      false,
      "Only JPG, PNG, WEBP allowed",
    );
  }

  if (size > maxSize) {
    return sendResponse(
      res,
      status.BAD_REQUEST,
      false,
      "File size must be under 2MB",
    );
  }

  return sendResponse(res, status.OK, true, "File is valid");
});

export const indexRoute = router;
