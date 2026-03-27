import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name must be at most 50 characters long"),

  email: z.email("Email must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(50, "Password must be at most 50 characters long"),
  image: z.url("Image must be a valid URL").nullable().optional(),
  bio: z
    .string()
    .max(250, "Bio must be at most 250 characters long")
    .nullable()
    .optional(),
});

export const authValidation = {
  registerSchema,
};
