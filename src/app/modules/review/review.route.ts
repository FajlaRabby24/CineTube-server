import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.get("/", ReviewController.getAllReviews);

router.get(
  "/pending",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.getPendingReviews,
);

router.get("/:id", ReviewController.getReviewById);

router.post(
  "/",
  checkAuth(),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewController.createReview,
);

router.patch(
  "/:id",
  checkAuth(),
  validateRequest(ReviewValidation.updateReviewSchema),
  ReviewController.updateReview,
);

router.delete(
  "/:id",
  checkAuth(),
  ReviewController.deleteReview,
);

router.patch(
  "/:id/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.approveReview,
);

router.patch(
  "/:id/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.rejectReviewSchema),
  ReviewController.rejectReview,
);

router.post(
  "/:id/like",
  checkAuth(),
  ReviewController.likeReview,
);

export const ReviewRoutes = router;
