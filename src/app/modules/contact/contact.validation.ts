import { z } from "zod";

const createContactMessageSchema = z.object({
  name: z.string({
    error: "Name is required",
  }),
  email: z
    .string({
      error: "Email is required",
    })
    .email("Invalid email address"),
  phone: z.string().optional(),
  subject: z.string({
    error: "Subject is required",
  }),
  message: z
    .string({
      error: "Message is required",
    })
    .min(10, "Message must be at least 10 characters long"),
});

export const ContactValidation = {
  createContactMessageSchema,
};
