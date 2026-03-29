import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { CommentController } from "./comment.controller";

const router = Router();

router.get(
  "/review/:reviewId",
  CommentController.getCommentsByReview,
);

router.post(
  "/:id/like",
  checkAuth(),
  CommentController.likeComment,
);

export const CommentRoutes = router;
