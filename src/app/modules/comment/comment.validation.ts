import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const CommentValidation = {
  createCommentSchema,
  updateCommentSchema,
  paginationSchema,
};
