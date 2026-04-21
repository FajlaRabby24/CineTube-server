import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { WatchlistService } from "./watchlist.service.js";

const getUserWatchlist = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await WatchlistService.getUserWatchlistFromDB(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Watchlist retrieved successfully",
    result.data,
    result.meta,
  );
});

const addToWatchlist = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { mediaId } = req.params;
  const result = await WatchlistService.addToWatchlistDB(
    userId,
    mediaId as string,
  );

  sendResponse(res, status.CREATED, true, "Added to watchlist", result);
});

const removeFromWatchlist = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { mediaId } = req.params;
  await WatchlistService.removeFromWatchlistDB(userId, mediaId as string);

  sendResponse(res, status.OK, true, "Removed from watchlist", null);
});

export const WatchlistController = {
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};
