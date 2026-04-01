import status from "http-status";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { IPricingUpdatePaylod } from "./pricing.type.js";

const getAllPricingPlansFromDB = async () => {
  const result = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  return result;
};

const updatePricingPlanFromDB = async (
  pricingId: string,
  payload: IPricingUpdatePaylod,
) => {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: pricingId },
  });

  if (!plan) {
    throw new AppError(status.NOT_FOUND, "Pricing plan not found");
  }

  if (payload.stripePriceId === "") {
    payload.stripePriceId = null;
  }

  const result = await prisma.pricingPlan.update({
    where: { id: pricingId },
    data: payload,
  });

  return result;
};

export const PricingService = {
  getAllPricingPlansFromDB,
  updatePricingPlanFromDB,
};
