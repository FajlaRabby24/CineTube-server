import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "../review/review.controller";
import { MediaController } from "./media.controller";
import { MediaValidation } from "./media.validation";

const router = Router();

// Public routes
router.get("/", MediaController.getAllMedia);
router.get("/:slug", MediaController.getMediaBySlug);
router.get("/:mediaId/details", MediaController.getMediaById);
router.post("/:mediaId/add-views", MediaController.addViews);
router.post(
  "/:mediaId/like",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  MediaController.toggleLikeMedia,
);
router.get(
  "/:mediaId/vote-status",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  MediaController.getUserVoteStatus,
);

// Admin routes
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.createMediaSchema),
  MediaController.createMedia,
);

router.patch(
  "/:mediaId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.updateMediaSchema),
  MediaController.updateMedia,
);

router.delete(
  "/:mediaId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  MediaController.deleteMedia,
);

// Media Reviews - Public
router.get("/:mediaId/reviews", ReviewController.getMediaReviews);

export const MediaRoutes = router;
