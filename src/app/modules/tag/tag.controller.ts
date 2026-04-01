import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { TagService } from "./tag.service.js";

const getAllTags = catchAsync(async (_req: Request, res: Response) => {
  const result = await TagService.getAllTagsFromDB();

  sendResponse(res, status.OK, true, "Tags retrieved successfully", result);
});

const createTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.createTagIntoDB(req.body);

  sendResponse(res, status.CREATED, true, "Tag created successfully", result);
});

const deleteTag = catchAsync(async (req: Request, res: Response) => {
  const { tagId } = req.params;
  await TagService.deleteTagFromDB(tagId as string);

  sendResponse(res, status.OK, true, "Tag deleted successfully", null);
});

export const TagController = {
  getAllTags,
  createTag,
  deleteTag,
};
