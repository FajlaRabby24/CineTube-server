import { z } from "zod";
import {
  AgeRating,
  ContentStatus,
  Genre,
  MediaType,
  PricingType,
} from "../../../generated/prisma/enums";

const createMediaSchema = z.object({
  title: z.string({ error: "Title is required" }),
  synopsis: z.string({ error: "Synopsis is required" }),
  type: z.nativeEnum(MediaType),
  releaseYear: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 5),
  ageRating: z.nativeEnum(AgeRating).optional(),
  duration: z.number().int().optional(),
  youtubeStreamUrl: z.string().url().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  pricingType: z.nativeEnum(PricingType).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
  isFeatured: z.boolean().optional(),
  isEditorsPick: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  genres: z.array(z.nativeEnum(Genre)).min(1, "At least one genre is required"),
  tags: z.array(z.string()).optional(),
});

const updateMediaSchema = createMediaSchema.partial();

export const MediaValidation = {
  createMediaSchema,
  updateMediaSchema,
};
