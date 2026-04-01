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

  sendResponse(res, status.OK, true, "Media retrieved successfully", result);
});

const getMediaBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await MediaService.getMediaBySlugFromDB(slug as string);

  sendResponse(
    res,
    status.OK,
    true,
    "Media details retrieved successfully",
    result,
  );
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

export const MediaController = {
  createMedia,
  getAllMedia,
  getMediaBySlug,
  updateMedia,
  deleteMedia,
};
