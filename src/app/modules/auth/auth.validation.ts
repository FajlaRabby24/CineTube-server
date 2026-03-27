import { z } from "zod";
import { Role } from "../../../generated/prisma/enums";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name must be at most 50 characters long"),

  email: z.email("Email must be a valid email address"),

  emailVerified: z.boolean().default(false),

  image: z.url("Image must be a valid URL").nullable().optional(),

  role: z.enum([Role.USER, Role.ADMIN]).default(Role.USER).optional(),

  bio: z
    .string()
    .max(250, "Bio must be at most 250 characters long")
    .nullable()
    .optional(),

  isActive: z.boolean().default(true).optional(),

  isBanned: z.boolean().default(false).optional(),

  bannedReason: z.string().nullable().optional(),

  bannedAt: z.date().nullable().optional(),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const authValidation = {
  registerSchema,
};
