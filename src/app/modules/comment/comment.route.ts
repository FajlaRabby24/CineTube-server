import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import { CommentValidation } from "./comment.validation";

const router = Router();

// Replies, Updates, and Deletions
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
