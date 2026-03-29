import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CommentService } from "./comment.service";

const getCommentsByReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const result = await CommentService.getCommentsByReviewFromDB(reviewId as string);

  sendResponse(res, status.OK, true, "Comments retrieved successfully", result);
});

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { reviewId } = req.params;
  const { content } = req.body;

  const result = await CommentService.createCommentIntoDB(
    reviewId as string,
    userId,
    content,
  );

  sendResponse(res, status.CREATED, true, "Comment created successfully", result);
});

const createReply = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const { content } = req.body;

  const result = await CommentService.createReplyIntoDB(id as string, userId, content);

  sendResponse(res, status.CREATED, true, "Reply created successfully", result);
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const { content } = req.body;

  const result = await CommentService.updateCommentIntoDB(id as string, userId, content);

  sendResponse(res, status.OK, true, "Comment updated successfully", result);
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.user as IRequestUser;
  const { id } = req.params;

  await CommentService.deleteCommentIntoDB(id as string, userId, role);

  sendResponse(res, status.OK, true, "Comment deleted successfully", null);
});

const likeComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await CommentService.toggleLikeCommentIntoDB(id as string, userId);

  sendResponse(res, status.OK, true, result.liked ? "Comment liked" : "Comment unliked", result);
});

export const CommentController = {
  getCommentsByReview,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  likeComment,
};
