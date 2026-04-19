import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { WatchlistController } from "./watchlist.controller";

const router = Router();

router.get("/", checkAuth(Role.USER), WatchlistController.getUserWatchlist);

router.post(
  "/:mediaId",
  checkAuth(Role.USER),
  WatchlistController.addToWatchlist,
);

router.delete(
  "/:mediaId",
  checkAuth(Role.USER),
  WatchlistController.removeFromWatchlist,
);

export const WatchlistRoutes = router;
