import { Request, Response } from "express";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ReportService } from "./report.service.js";

const createReport = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const payload = req.body;
  const result = await ReportService.createReportIntoDB(userId, payload);

  sendResponse(
    res,
    status.CREATED,
    true,
    "Report submitted successfully",
    result,
  );
});

const getPendingReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getPendingReportsFromDB(
    req.query as IQueryParams,
  );

  sendResponse(res, status.OK, true, "Reports retrieved successfully", result);
});

const resolveReport = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const { reportId } = req.params;
  const { resolution } = req.body;
  const result = await ReportService.resolveReportFromDB(
    adminId,
    reportId as string,
    resolution,
  );

  sendResponse(res, status.OK, true, "Report resolved successfully", result);
});

const dismissReport = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const { reportId } = req.params;
  const result = await ReportService.dismissReportFromDB(
    adminId,
    reportId as string,
  );

  sendResponse(res, status.OK, true, "Report dismissed successfully", result);
});

export const ReportController = {
  createReport,
  getPendingReports,
  resolveReport,
  dismissReport,
};
