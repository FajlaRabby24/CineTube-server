import { Request, Response } from "express";
import httpStatus from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PricingService } from "./pricing.service.js";

const getAllPricingPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await PricingService.getAllPricingPlansFromDB();

  sendResponse(
    res,
    httpStatus.OK,
    true,
    "Pricing plans retrieved successfully",
    result,
  );
});

const createPricingPlan = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const result = await PricingService.createPricingPlanToDB(req.body, adminId);

  sendResponse(
    res,
    httpStatus.CREATED,
    true,
    "Pricing plan created successfully",
    result,
  );
});

const updatePricingPlan = catchAsync(async (req: Request, res: Response) => {
  const { userId: adminId } = req.user as IRequestUser;
  const { pricingId } = req.params;
  const result = await PricingService.updatePricingPlanFromDB(
    pricingId as string,
    req.body,
    adminId,
  );

  sendResponse(
    res,
    httpStatus.OK,
    true,
    "Pricing plan updated successfully",
    result,
  );
});

export const PricingController = {
  getAllPricingPlans,
  createPricingPlan,
  updatePricingPlan,
};
