import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import { CommentValidation } from "./comment.validation";

const router = Router();

// Replies, Updates, and Deletions
router.post(
  "/:commentId/reply",
  checkAuth(),
  validateRequest(CommentValidation.createCommentSchema),
  CommentController.createReply,
);

router.patch(
  "/:commentId",
  checkAuth(),
  validateRequest(CommentValidation.updateCommentSchema),
  CommentController.updateComment,
);

router.delete("/:commentId", checkAuth(), CommentController.deleteComment);

router.post("/:commentId/like", checkAuth(), CommentController.likeComment);

export const CommentRoutes = router;
