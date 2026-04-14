import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

const getUserPayments = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await PaymentService.getUserPaymentsFromDB(
    userId,
    req.query as IQueryParams,
  );

  sendResponse(res, status.OK, true, "Payments retrieved successfully", result);
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPaymentsFromDB(
    req.query as IQueryParams,
  );

  sendResponse(
    res,
    status.OK,
    true,
    "Payments retrieved successfully",
    result,
  );
});

export const PaymentController = {
  getUserPayments,
  getAllPayments,
};
