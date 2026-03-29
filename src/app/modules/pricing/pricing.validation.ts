import { z } from "zod";

const updatePricingPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  stripePriceId: z.string().nullable().optional(),
});

export const PricingValidation = {
  updatePricingPlanSchema,
};
