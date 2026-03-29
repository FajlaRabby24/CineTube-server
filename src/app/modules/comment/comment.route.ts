import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import { CommentValidation } from "./comment.validation";

const router = Router();

router.get(
  "/review/:reviewId",
  CommentController.getCommentsByReview,
);

router.post(
  "/review/:reviewId",
  checkAuth(),
  validateRequest(CommentValidation.createCommentSchema),
  CommentController.createComment,
);

router.post(
  "/:id/reply",
  checkAuth(),
  validateRequest(CommentValidation.createCommentSchema),
  CommentController.createReply,
);

router.patch(
  "/:id",
  checkAuth(),
  validateRequest(CommentValidation.updateCommentSchema),
  CommentController.updateComment,
);

router.delete(
  "/:id",
  checkAuth(),
  CommentController.deleteComment,
);

router.post(
  "/:id/like",
  checkAuth(),
  CommentController.likeComment,
);

export const CommentRoutes = router;
