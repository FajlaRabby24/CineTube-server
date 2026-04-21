import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { DashboardService } from "./dashboard.service.js";

const getUserDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user as IRequestUser;
    const result = await DashboardService.getUserDashboardStats(userId);

    sendResponse(
      res,
      status.OK,
      true,
      "User dashboard stats retrieved successfully",
      result,
    );
  },
);

export const DashboardController = {
  getUserDashboardStats,
};
