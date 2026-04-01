import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { NotificationService } from "./notification.service.js";

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await NotificationService.getUserNotificationsFromDB(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Notifications retrieved successfully",
    result,
  );
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  await NotificationService.markAllAsReadFromDB(userId);

  sendResponse(res, status.OK, true, "All notifications marked as read", null);
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { notificationId } = req.params;
  const result = await NotificationService.markAsReadFromDB(
    userId,
    notificationId as string,
  );

  sendResponse(res, status.OK, true, "Notification marked as read", result);
});

export const NotificationController = {
  getUserNotifications,
  markAllAsRead,
  markAsRead,
};
