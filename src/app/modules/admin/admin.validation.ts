import { z } from "zod";

const createAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.email("Email must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const banUserSchema = z.object({
  isBanned: z.boolean(),
  bannedReason: z.string().optional(),
});

const refundPaymentSchema = z.object({
  refundReason: z
    .string()
    .min(5, "Refund reason must be at least 5 characters long"),
});

export const AdminValidation = {
  createAdminSchema,
  banUserSchema,
  refundPaymentSchema,
};
