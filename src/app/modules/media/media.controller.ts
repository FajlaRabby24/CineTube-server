import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MediaService } from "./media.service";

const createMedia = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const result = await MediaService.createMediaIntoDB(adminId, req.body);

  sendResponse(res, status.CREATED, true, "Media created successfully", result);
});

const getAllMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await MediaService.getAllMediaFromDB(req.query);

  sendResponse(
    res,
    status.OK,
    true,
    "Media retrieved successfully",
    result.data,
    result.meta,
  );
});

const getMediaBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await MediaService.getMediaBySlugFromDB(slug as string);

  sendResponse(
    res,
    status.OK,
    true,
    "Media details retrieved successfully",
    result.data[0],
  );
});

const getMediaById = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const result = await MediaService.getMediaByIdFromDB(mediaId as string);

  sendResponse(
    res,
    status.OK,
    true,
    "Media details retrieved successfully",
    result.data[0],
  );
});

const addViews = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const result = await MediaService.addViewsInDB(mediaId as string);

  sendResponse(res, status.OK, true, "Views added successfully", result);
});

const toggleLikeMedia = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const userId = req.user.userId;
  const { type } = req.body;
  const result = await MediaService.toggleLikeMediaInDB(mediaId as string, userId, type);

  sendResponse(res, status.OK, true, "Media vote updated successfully", result);
});

const updateMedia = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const adminId = req.user.userId;
  const result = await MediaService.updateMediaInDB(
    adminId,
    mediaId as string,
    req.body,
  );

  sendResponse(res, status.OK, true, "Media updated successfully", result);
});

const deleteMedia = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const adminId = req.user.userId;
  await MediaService.deleteMediaFromDB(adminId, mediaId as string);

  sendResponse(res, status.OK, true, "Media deleted successfully", null);
});

const getUserVoteStatus = catchAsync(async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const userId = req.user.userId;
  const result = await MediaService.getUserVoteStatusFromDB(mediaId as string, userId);

  sendResponse(res, status.OK, true, "User vote status retrieved successfully", result);
});

export const MediaController = {
  createMedia,
  getAllMedia,
  getMediaBySlug,
  addViews,
  getMediaById,
  updateMedia,
  toggleLikeMedia,
  getUserVoteStatus,
  deleteMedia,
};
