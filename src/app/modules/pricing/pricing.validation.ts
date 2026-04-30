import { z } from "zod";
import { SubscriptionPlan } from "../../../generated/prisma";

const createPricingPlanSchema = z.object({
  name: z.string().min(1).max(100),
  plan: z.nativeEnum(SubscriptionPlan),
  price: z.number().min(0),
  currency: z.string().default("usd"),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
});

const updatePricingPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  stripePriceId: z.string().nullable().optional(),
});

export const PricingValidation = {
  createPricingPlanSchema,
  updatePricingPlanSchema,
};
