import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "../comment/comment.controller";
import { CommentValidation } from "../comment/comment.validation";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.getAllReviewsAdmin,
);

router.get("/", checkAuth(), ReviewController.getUserReviews);

router.get(
  "/pending",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.getPendingReviews,
);

router.get("/:reviewId", ReviewController.getReviewById);

router.post(
  "/:mediaId",
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
  "/admin/:reviewId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.deleteReviewAdmin,
);

router.delete("/:reviewId", checkAuth(), ReviewController.deleteReview);

router.patch(
  "/:reviewId/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.approveReview,
);

router.patch(
  "/:reviewId/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.rejectReviewSchema),
  ReviewController.rejectReview,
);

router.post("/:reviewId/like", checkAuth(), ReviewController.likeReview);

// Nested Comment Routes
router.get("/:reviewId/comments", CommentController.getCommentsByReview);

router.post(
  "/:reviewId/comments",
  checkAuth(),
  validateRequest(CommentValidation.createCommentSchema),
  CommentController.createComment,
);

export const ReviewRoutes = router;
