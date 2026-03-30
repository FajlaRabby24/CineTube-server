import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "../review/review.controller";
import { ReviewValidation } from "../review/review.validation";
import { MediaController } from "./media.controller";
import { MediaValidation } from "./media.validation";

const router = Router();

// Public routes
router.get("/", MediaController.getAllMedia);
router.get("/featured", MediaController.getFeaturedMedia);
router.get("/trending", MediaController.getTrendingMedia);
router.get("/editors-picks", MediaController.getEditorsPicks);
router.get("/search", MediaController.searchMedia);
router.get("/:slug", MediaController.getMediaBySlug);

// Admin routes
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.createMediaSchema),
  MediaController.createMedia,
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.updateMediaSchema),
  MediaController.updateMedia,
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  MediaController.deleteMedia,
);

// Media Reviews - Authenticated
router.post(
  "/:mediaId/reviews",
  checkAuth(),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewController.createReview,
);

// Media Reviews - Public
router.get("/:mediaId/reviews", ReviewController.getMediaReviews);

export const MediaRoutes = router;
