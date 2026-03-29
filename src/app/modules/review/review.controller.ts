import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ReviewService } from "./review.service.js";

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllApprovedReviewsFromDB(
    req.query as IQueryParams,
  );

  sendResponse(res, status.OK, true, "Reviews retrieved successfully", result);
});

const getPendingReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getPendingReviewsFromDB(
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Pending reviews retrieved successfully",
    result,
  );
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.getReviewByIdFromDB(id as string);

  sendResponse(res, status.OK, true, "Review retrieved successfully", result);
});

const getMediaReviews = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const result = await ReviewService.getMediaReviewsFromDB(
    mediaId as string,
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Media reviews retrieved successfully",
    result,
  );
});

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { mediaId } = req.params;
  const result = await ReviewService.createReviewIntoDB(
    userId,
    mediaId as string,
    req.body,
  );

  sendResponse(
    res,
    status.CREATED,
    true,
    "Review submitted successfully",
    result,
  );
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await ReviewService.updateReviewIntoDB(
    id as string,
    userId,
    req.body,
  );

  sendResponse(res, status.OK, true, "Review updated successfully", result);
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  await ReviewService.deleteReviewFromDB(id as string, userId);

  sendResponse(res, status.OK, true, "Review deleted successfully", null);
});

const approveReview = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await ReviewService.approveReviewIntoDB(id as string, adminId);

  sendResponse(res, status.OK, true, "Review approved successfully", result);
});

const rejectReview = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await ReviewService.rejectReviewIntoDB(
    id as string,
    adminId,
    req.body,
  );

  sendResponse(res, status.OK, true, "Review rejected successfully", result);
});

const likeReview = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { id } = req.params;
  const result = await ReviewService.toggleLikeReviewIntoDB(id as string, userId);

  sendResponse(res, status.OK, true, result.liked ? "Review liked" : "Review unliked", result);
});

export const ReviewController = {
  getAllReviews,
  getPendingReviews,
  getReviewById,
  getMediaReviews,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  rejectReview,
  likeReview,
};
