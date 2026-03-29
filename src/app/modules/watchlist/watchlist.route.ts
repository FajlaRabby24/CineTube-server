import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { WatchlistController } from "./watchlist.controller";

const router = Router();

router.get(
  "/",
  checkAuth(),
  WatchlistController.getUserWatchlist,
);

router.post(
  "/:mediaId",
  checkAuth(),
  WatchlistController.addToWatchlist,
);

router.delete(
  "/:mediaId",
  checkAuth(),
  WatchlistController.removeFromWatchlist,
);

export const WatchlistRoutes = router;
