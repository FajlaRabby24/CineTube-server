import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PricingService } from "./pricing.service.js";

const getAllPricingPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await PricingService.getAllPricingPlansFromDB();

  sendResponse(res, status.OK, true, "Pricing plans retrieved successfully", result);
});

const updatePricingPlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PricingService.updatePricingPlanFromDB(id as string, req.body);

  sendResponse(res, status.OK, true, "Pricing plan updated successfully", result);
});

export const PricingController = {
  getAllPricingPlans,
  updatePricingPlan,
};
