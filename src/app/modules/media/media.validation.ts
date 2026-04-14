import { z } from "zod";
import {
  AgeRating,
  ContentStatus,
  Genre,
  MediaType,
  PricingType,
  StreamingPlatform,
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
  totalSeasons: z.number().int().optional(),
  totalEpisodes: z.number().int().optional(),
  youtubeStreamUrl: z.url().optional(),
  imdbId: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  pricingType: z.nativeEnum(PricingType).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
  isFeatured: z.boolean().optional(),
  isEditorsPick: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  genres: z.array(z.nativeEnum(Genre)).min(1, "At least one genre is required"),
  platforms: z
    .array(
      z.object({
        platform: z.nativeEnum(StreamingPlatform),
        streamUrl: z.url().optional(),
      }),
    )
    .optional(),
  castMembers: z
    .array(
      z.object({
        actorName: z.string(),
        character: z.string().optional(),
        profileUrl: z.url().optional(),
      }),
    )
    .optional(),
  directors: z
    .array(
      z.object({
        directorName: z.string(),
        profileUrl: z.url().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

const updateMediaSchema = createMediaSchema.partial();

export const MediaValidation = {
  createMediaSchema,
  updateMediaSchema,
};
