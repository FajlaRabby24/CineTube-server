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
import { TagRoutes } from "../modules/tag/tag.route";
import { WatchlistRoutes } from "../modules/watchlist/watchlist.route";
import { SubscriptionRoutes } from "../modules/subscription/subscription.route";

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

export const indexRoute = router;
