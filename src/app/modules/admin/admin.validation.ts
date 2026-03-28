import { z } from "zod";

const createAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.email("Email must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  designation: z.string().optional(),
  address: z.string().optional(),
});

export const AdminValidation = {
  createAdminSchema,
};
