import { SubscriptionPlan } from "../../../generated/prisma";

export interface IPricingCreatePayload {
  name: string;
  plan: SubscriptionPlan;
  price: number;
  currency?: string;
  features: string[];
  isActive?: boolean;
  isPopular?: boolean;
  stripePriceId?: string | null;
}

export interface IPricingUpdatePaylod {
  name?: string;
  price?: number;
  features?: string[];
  isActive?: boolean;
  isPopular?: boolean;
  stripePriceId?: string | null;
}
