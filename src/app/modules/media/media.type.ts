import { z } from "zod";
import { MediaValidation } from "./media.validation";

export type ICreateMediaPayload = z.infer<
  typeof MediaValidation.createMediaSchema
>;
export type IUpdateMediaPayload = z.infer<
  typeof MediaValidation.updateMediaSchema
>;

export interface IMediaFilters {
  searchTerm?: string;
  type?: string;
  genre?: string;
  pricingType?: string;
  releaseYear?: number;
  status?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isEditorsPick?: boolean;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
