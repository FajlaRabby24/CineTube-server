import { Router } from "express";
import { AdminRoutes } from "../modules/admin/admin.route";
import { authRoute } from "../modules/auth/auth.route";
import { CommentRoutes } from "../modules/comment/comment.route";
import { MediaRoutes } from "../modules/media/media.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { PricingRoutes } from "../modules/pricing/pricing.route";
import { ReportRoutes } from "../modules/report/report.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";
import { TagRoutes } from "../modules/tag/tag.route";
import { WatchlistRoutes } from "../modules/watchlist/watchlist.route";
import { WebhookRoutes } from "../modules/webhook/webhook.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/admin", AdminRoutes);
router.use("/media", MediaRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/comments", CommentRoutes);
router.use("/watchlist", WatchlistRoutes);
router.use("/tags", TagRoutes);
router.use("/subscription", SubscriptionRoutes);
router.use("/payments", PaymentRoutes);
router.use("/pricing", PricingRoutes);
router.use("/reports", ReportRoutes);
router.use("/webhook", WebhookRoutes);

export const indexRoute = router;
