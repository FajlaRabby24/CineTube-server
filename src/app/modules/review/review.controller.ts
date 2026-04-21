import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ReviewService } from "./review.service.js";

const getAllReviewsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviewsForAdminFromDB(
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Admin reviews retrieved successfully",
    result.data,
    result.meta,
  );
});

const getUserReviews = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await ReviewService.getUserReviewsFromDB(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "User reviews retrieved successfully",
    result.data,
    result.meta,
  );
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
  const { reviewId } = req.params;
  const result = await ReviewService.getReviewByIdFromDB(reviewId as string);

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
    result.data,
    result.meta,
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
  const { reviewId } = req.params;
  await ReviewService.deleteReviewFromDB(reviewId as string, userId);

  sendResponse(res, status.OK, true, "Review deleted successfully", null);
});

const deleteReviewAdmin = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  await ReviewService.deleteReviewByAdminFromDB(reviewId as string);

  sendResponse(res, status.OK, true, "Review deleted successfully", null);
});

const approveReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { userId: adminId } = req.user as IRequestUser;
  const result = await ReviewService.approveReviewIntoDB(
    reviewId as string,
    adminId,
  );

  sendResponse(res, status.OK, true, "Review approved successfully", result);
});

const rejectReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { userId: adminId } = req.user as IRequestUser;
  const result = await ReviewService.rejectReviewIntoDB(
    reviewId as string,
    adminId,
    req.body,
  );

  sendResponse(res, status.OK, true, "Review rejected successfully", result);
});

const likeReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { userId } = req.user as IRequestUser;
  const result = await ReviewService.toggleLikeReviewIntoDB(
    reviewId as string,
    userId,
  );

  sendResponse(
    res,
    status.OK,
    true,
    result.liked ? "Review liked" : "Review unliked",
    result,
  );
});

export const ReviewController = {
  getAllReviewsAdmin,
  getUserReviews,
  getPendingReviews,
  getReviewById,
  getMediaReviews,
  createReview,
  updateReview,
  deleteReview,
  deleteReviewAdmin,
  approveReview,
  rejectReview,
  likeReview,
};
