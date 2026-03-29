import { Review, Media, User, Prisma } from "../../../generated/prisma/client";

export type { Review, Media, User };

export interface ICreateReviewPayload {
  rating: number;
  title?: string;
  content: string;
  hasSpoiler?: boolean;
}

export interface IUpdateReviewPayload {
  rating?: number;
  title?: string | null;
  content?: string;
  hasSpoiler?: boolean;
}

export interface IRejectReviewPayload {
  reason: string;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        image: true;
      };
    };
    media: {
      select: {
        id: true;
        title: true;
        slug: true;
        posterUrl: true;
      };
    };
    _count: {
      select: {
        likes: true;
        comments: true;
      };
    };
  };
}>;
