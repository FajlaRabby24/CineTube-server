import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "../comment/comment.controller";
import { CommentValidation } from "../comment/comment.validation";
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

// Nested Comment Routes
router.get(
  "/:reviewId/comments",
  CommentController.getCommentsByReview,
);

router.post(
  "/:reviewId/comments",
  checkAuth(),
  validateRequest(CommentValidation.createCommentSchema),
  CommentController.createComment,
);

export const ReviewRoutes = router;
