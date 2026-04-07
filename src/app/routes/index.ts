import { Router } from "express";
import { AdminRoutes } from "../modules/admin/admin.route";
import { authRoute } from "../modules/auth/auth.route";
import { CommentRoutes } from "../modules/comment/comment.route";
import { MediaRoutes } from "../modules/media/media.route";
import { NotificationRoutes } from "../modules/notification/notification.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { PricingRoutes } from "../modules/pricing/pricing.route";
import { ReportRoutes } from "../modules/report/report.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";
import { TagRoutes } from "../modules/tag/tag.route";
import { WatchlistRoutes } from "../modules/watchlist/watchlist.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/admin", AdminRoutes);
router.use("/media", MediaRoutes);
router.use("/review", ReviewRoutes);
router.use("/comments", CommentRoutes);
router.use("/watchlist", WatchlistRoutes);
router.use("/tags", TagRoutes);
router.use("/reports", ReportRoutes);
router.use("/notifications", NotificationRoutes);
router.use("/payments", PaymentRoutes);
router.use("/pricing", PricingRoutes);
router.use("/subscriptions", SubscriptionRoutes);

router.post("/validate-file", async (req, res) => {
  const { name, size, type } = req.body;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!name || !size || !type) {
    return res.status(400).json({ ok: false, message: "Missing file info" });
  }

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      ok: false,
      message: "Only JPG, PNG, WEBP allowed",
    });
  }

  if (size > maxSize) {
    return res.status(400).json({
      ok: false,
      message: "File size must be under 5MB",
    });
  }

  return res.status(200).json({ ok: true, message: "File is valid" });
});

export const indexRoute = router;
