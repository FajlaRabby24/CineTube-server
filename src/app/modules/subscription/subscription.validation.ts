import { z } from "zod";
import { SubscriptionPlan } from "../../../generated/prisma";

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

export const SubscriptionValidation = {
  checkoutSchema,
};
