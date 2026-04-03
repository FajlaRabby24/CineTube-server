import status from "http-status";
import {
  AuditAction,
  SubscriptionPlan,
} from "../../../generated/prisma/enums.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { IPricingCreatePayload, IPricingUpdatePaylod } from "./pricing.type.js";

const getAllPricingPlansFromDB = async () => {
  const result = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  return result;
};

const createPricingPlanToDB = async (
  payload: IPricingCreatePayload,
  adminId: string,
) => {
  if (payload.plan === SubscriptionPlan.FREE) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot create pricing plan for FREE plan",
    );
  }

  if (
    payload.plan !== SubscriptionPlan.MONTHLY &&
    payload.plan !== SubscriptionPlan.YEARLY
  ) {
    throw new AppError(status.BAD_REQUEST, "Invalid plan type");
  }

  const existingPlan = await prisma.pricingPlan.findUnique({
    where: { plan: payload.plan },
  });

  if (existingPlan) {
    throw new AppError(
      status.BAD_REQUEST,
      `Pricing plan with plan type '${payload.plan}' already exists`,
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pricePlan = await tx.pricingPlan.create({
        data: {
          ...payload,
          stripePriceId:
            payload.plan === SubscriptionPlan.MONTHLY
              ? envVars.STRIPE_MONTLY_PRODUCT_ID
              : envVars.STRIPE_YEARLY_PRODUCT_ID,
        },
      });

      await tx.auditLog.create({
        data: {
          targetId: pricePlan.id,
          adminId,
          action: AuditAction.PRICING_PLAN_CREATED,
          details: `Created pricing plan: ${payload.name} (${payload.plan})`,
        },
      });
      return pricePlan;
    });
    return result;
  } catch (error) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create pricing plan",
    );
  }
};

const updatePricingPlanFromDB = async (
  pricingId: string,
  payload: IPricingUpdatePaylod,
  adminId: string,
) => {
  try {
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

    await prisma.auditLog.create({
      data: {
        adminId,
        action: AuditAction.PRICING_PLAN_UPDATED,
        targetId: result.id,
        details: `Updated pricing plan: ${result.name}`,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to update pricing plan",
    );
  }
};

export const PricingService = {
  getAllPricingPlansFromDB,
  createPricingPlanToDB,
  updatePricingPlanFromDB,
};
