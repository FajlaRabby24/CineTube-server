import { z } from "zod";
import { AdminValidation } from "./admin.validation";

export type IAdminCreatePayload = z.infer<
  typeof AdminValidation.createAdminSchema
>;

export interface IAdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
  };
  media: {
    total: number;
    movies: number;
    series: number;
  };
  revenue: {
    total: number;
    monthly: number;
    yearly: number;
  };
  pending: {
    reviews: number;
    reports: number;
  };
}

export type IBanUnbanUserPayload = z.infer<
  typeof AdminValidation.banUserSchema
>;
