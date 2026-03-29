import { Router } from "express";
import { AdminRoutes } from "../modules/admin/admin.route";
import { authRoute } from "../modules/auth/auth.route";
import { CommentRoutes } from "../modules/comment/comment.route";
import { MediaRoutes } from "../modules/media/media.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { TagRoutes } from "../modules/tag/tag.route";
import { WatchlistRoutes } from "../modules/watchlist/watchlist.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/admin", AdminRoutes);
router.use("/media", MediaRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/comments", CommentRoutes);
router.use("/watchlist", WatchlistRoutes);
router.use("/tags", TagRoutes);

export const indexRoute = router;
