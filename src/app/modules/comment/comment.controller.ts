import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CommentService } from "./comment.service";

const getCommentsByReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const result = await CommentService.getCommentsByReviewFromDB(
    reviewId as string,
  );

  sendResponse(res, status.OK, true, "Comments retrieved successfully", result);
});

const getUserComments = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await CommentService.getUserCommentsFromDB(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "User comments retrieved successfully",
    result.data,
    result.meta,
  );
});

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { userId } = req.user as IRequestUser;
  const { content } = req.body;

  const result = await CommentService.createCommentIntoDB(
    reviewId as string,
    userId,
    content,
  );

  sendResponse(
    res,
    status.CREATED,
    true,
    "Comment created successfully",
    result,
  );
});

const createReply = catchAsync(async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { userId } = req.user as IRequestUser;
  const { content } = req.body;

  const result = await CommentService.createReplyIntoDB(
    commentId as string,
    userId,
    content,
  );

  sendResponse(res, status.CREATED, true, "Reply created successfully", result);
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { commentId } = req.params;
  const { content } = req.body;

  const result = await CommentService.updateCommentIntoDB(
    userId,
    commentId as string,
    content,
  );

  sendResponse(res, status.OK, true, "Comment updated successfully", result);
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { userId, role } = req.user as IRequestUser;

  await CommentService.deleteCommentIntoDB(commentId as string, userId, role);

  sendResponse(res, status.OK, true, "Comment deleted successfully", null);
});

const likeComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { commentId } = req.params;
  const result = await CommentService.toggleLikeCommentIntoDB(
    userId,
    commentId as string,
  );

  sendResponse(
    res,
    status.OK,
    true,
    result.liked ? "Comment liked" : "Comment unliked",
    result,
  );
});

export const CommentController = {
  getCommentsByReview,
  getUserComments,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  likeComment,
};
