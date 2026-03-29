import { z } from "zod";
import { SubscriptionPlan } from "../../../generated/prisma/client.js";

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

export const SubscriptionValidation = {
  checkoutSchema,
};
