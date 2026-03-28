import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AdminService } from "./admin.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdminIntoDB(req.body);

  sendResponse(res, status.CREATED, true, "Admin created successfully", result);
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(
    res,
    status.OK,
    true,
    "Dashboard stats retrieved successfully",
    result,
  );
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);

  sendResponse(res, status.OK, true, "Users retrieved successfully", result);
});

const banUnbanUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;
  const result = await AdminService.banUnbanUser(
    adminId,
    id as string,
    req.body,
  );

  sendResponse(
    res,
    status.OK,
    true,
    `User ${req.body.isBanned ? "banned" : "unbanned"} successfully`,
    result,
  );
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAuditLogs(req.query);

  sendResponse(
    res,
    status.OK,
    true,
    "Audit logs retrieved successfully",
    result,
  );
});

const getPaymentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getPaymentAnalytics(req.query);

  sendResponse(
    res,
    status.OK,
    true,
    "Payment analytics retrieved successfully",
    result,
  );
});

const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;
  const result = await AdminService.refundPayment(
    adminId,
    id as string,
    req.body,
  );

  sendResponse(res, status.OK, true, "Payment refunded successfully", result);
});

export const AdminController = {
  createAdmin,
  getDashboardStats,
  getAllUsers,
  banUnbanUser,
  getAuditLogs,
  getPaymentAnalytics,
  refundPayment,
};
