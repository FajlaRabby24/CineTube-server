import { z } from "zod";

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(10),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(5000),
  hasSpoiler: z.boolean().optional().default(false),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(10).optional(),
  title: z.string().max(200).optional().nullable(),
  content: z.string().min(10).max(5000).optional(),
  hasSpoiler: z.boolean().optional(),
});

const approveReviewSchema = z.object({});

const rejectReviewSchema = z.object({
  reason: z.string().min(1).max(500),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  sortBy: z.enum(["createdAt", "rating", "likesCount"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
  approveReviewSchema,
  rejectReviewSchema,
  paginationSchema,
};
