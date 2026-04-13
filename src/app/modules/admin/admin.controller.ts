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
  console.log(req.query, "controller");
  sendResponse(res, status.OK, true, "Users retrieved successfully", result);
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await AdminService.getUserById(userId as string);

  sendResponse(res, status.OK, true, "User retrieved successfully", result);
});

const getUserReviews = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await AdminService.getUserReviews(userId as string);

  sendResponse(
    res,
    status.OK,
    true,
    "User reviews retrieved successfully",
    result,
  );
});

const getAllAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllAdmins(req.query);
  sendResponse(
    res,
    status.OK,
    true,
    "Admins retrieved successfully",
    result.data,
    result.meta,
  );
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const { adminId } = req.params;
  const result = await AdminService.getAdminById(adminId as string);

  sendResponse(res, status.OK, true, "Admin retrieved successfully", result);
});

const banUnbanUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user.userId;
  console.log(req.body, "ban user controller");
  const result = await AdminService.banUnbanUser(
    adminId,
    userId as string,
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

// TODO: check this route after payment is implemented
const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const adminId = req.user?.userId;
  const result = await AdminService.refundPayment(
    adminId,
    paymentId as string,
    req.body,
  );

  sendResponse(res, status.OK, true, "Payment refunded successfully", result);
});

export const AdminController = {
  createAdmin,
  getDashboardStats,
  getAllUsers,
  getUserById,
  banUnbanUser,
  getAuditLogs,
  getPaymentAnalytics,
  refundPayment,
  getAllAdmin,
  getUserReviews,
  getAdminById,
};
