export interface IPricingUpdatePaylod {
  name?: string;
  price?: number;
  features?: string[];
  isActive?: boolean;
  isPopular?: boolean;
  stripePriceId?: string | null;
}
