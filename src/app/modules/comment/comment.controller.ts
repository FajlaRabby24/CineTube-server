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

const likeComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await CommentService.toggleLikeCommentIntoDB(id as string, userId);

  sendResponse(res, status.OK, true, result.liked ? "Comment liked" : "Comment unliked", result);
});

export const CommentController = {
  getCommentsByReview,
  likeComment,
};
