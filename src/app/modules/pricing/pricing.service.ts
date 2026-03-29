import status from "http-status";
import { SubscriptionPlan } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const getAllPricingPlansFromDB = async () => {
  const result = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  return result;
};

const updatePricingPlanFromDB = async (
  id: string,
  payload: {
    name?: string;
    price?: number;
    features?: string[];
    isActive?: boolean;
    isPopular?: boolean;
    stripePriceId?: string | null;
  },
) => {
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });

  if (!plan) {
    throw new AppError(status.NOT_FOUND, "Pricing plan not found");
  }

  if (payload.stripePriceId === "") {
    payload.stripePriceId = null;
  }

  const result = await prisma.pricingPlan.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const PricingService = {
  getAllPricingPlansFromDB,
  updatePricingPlanFromDB,
};
