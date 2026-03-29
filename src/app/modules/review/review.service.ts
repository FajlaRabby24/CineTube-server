import status from "http-status";
import { Prisma, Review, ReviewStatus } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import {
  ICreateReviewPayload,
  IRejectReviewPayload,
  IUpdateReviewPayload,
} from "./review.type.js";

const reviewInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  media: {
    select: {
      id: true,
      title: true,
      slug: true,
      posterUrl: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
};

const getAllApprovedReviewsFromDB = async (query: IQueryParams) => {
  const reviewQuery = new QueryBuilder<
    Review,
    Prisma.ReviewWhereInput,
    Prisma.ReviewInclude
  >(prisma.review, query, {
    searchableFields: ["content", "title", "user.name", "media.title"],
    filterableFields: ["status", "rating", "hasSpoiler", "userId", "mediaId"],
  })
    .filter()
    .where({ status: ReviewStatus.APPROVED })
    .search()
    .sort()
    .paginate()
    .include(reviewInclude);

  return await reviewQuery.execute();
};

const getPendingReviewsFromDB = async (query: IQueryParams) => {
  const reviewQuery = new QueryBuilder<
    Review,
    Prisma.ReviewWhereInput,
    Prisma.ReviewInclude
  >(prisma.review, query, {
    searchableFields: ["content", "title", "user.name", "media.title"],
    filterableFields: ["status", "rating", "hasSpoiler", "userId", "mediaId"],
  })
    .filter()
    .where({ status: ReviewStatus.PENDING })
    .search()
    .sort()
    .paginate()
    .include(reviewInclude);

  return await reviewQuery.execute();
};

const getReviewByIdFromDB = async (id: string) => {
  const result = await prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  return result;
};

const getMediaReviewsFromDB = async (mediaId: string, query: IQueryParams) => {
  const reviewQuery = new QueryBuilder<
    Review,
    Prisma.ReviewWhereInput,
    Prisma.ReviewInclude
  >(prisma.review, query, {
    searchableFields: ["content", "title", "user.name"],
    filterableFields: ["status", "rating", "hasSpoiler", "userId"],
  })
    .filter()
    .where({ mediaId, status: "APPROVED" })
    .search()
    .sort()
    .paginate()
    .include(reviewInclude);

  return await reviewQuery.execute();
};

const createReviewIntoDB = async (
  userId: string,
  mediaId: string,
  payload: ICreateReviewPayload,
) => {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  const existingReview = await prisma.review.findFirst({
    where: { userId, mediaId },
  });
  if (existingReview) {
    throw new AppError(
      status.BAD_REQUEST,
      "You have already reviewed this media",
    );
  }

  const result = await prisma.review.create({
    data: {
      userId,
      mediaId,
      rating: payload.rating,
      title: payload.title ?? null,
      content: payload.content,
      hasSpoiler: payload.hasSpoiler ?? false,
      status: "PENDING",
    },
    include: reviewInclude,
  });

  return result;
};

const updateReviewIntoDB = async (
  id: string,
  userId: string,
  payload: IUpdateReviewPayload,
) => {
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own reviews");
  }

  if (
    review.status !== ReviewStatus.PENDING &&
    review.status !== ReviewStatus.REJECTED
  ) {
    throw new AppError(status.BAD_REQUEST, "Cannot edit an approved review");
  }

  const filteredData = Object.fromEntries(
    Object.entries({
      rating: payload.rating,
      title: payload.title,
      content: payload.content,
      hasSpoiler: payload.hasSpoiler,
    }).filter(([_, v]) => v !== undefined),
  );

  const result = await prisma.review.update({
    where: { id },
    data: {
      ...filteredData,
      status: ReviewStatus.PENDING,
      publishedAt: null,
      rejectedReason: null,
    },
    include: reviewInclude,
  });

  return result;
};

const deleteReviewFromDB = async (id: string, userId: string) => {
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own reviews",
    );
  }

  await prisma.review.delete({ where: { id } });
};

const approveReviewIntoDB = async (id: string, adminId: string) => {
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.status === ReviewStatus.APPROVED) {
    throw new AppError(status.BAD_REQUEST, "Review is already approved");
  }

  const averageRating = await calculateNewAverageRating(
    review.mediaId,
    review.rating,
  );

  const [updatedReview] = await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: {
        status: ReviewStatus.APPROVED,
        publishedAt: new Date(),
        moderatedBy: adminId,
      },
      include: reviewInclude,
    }),
    prisma.media.update({
      where: { id: review.mediaId },
      data: {
        totalReviews: { increment: 1 },
        averageRating: { set: averageRating },
      },
    }),
  ]);

  return updatedReview;
};

const rejectReviewIntoDB = async (
  id: string,
  adminId: string,
  payload: IRejectReviewPayload,
) => {
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.status === ReviewStatus.REJECTED) {
    throw new AppError(status.BAD_REQUEST, "Review is already rejected");
  }

  const result = await prisma.review.update({
    where: { id },
    data: {
      status: ReviewStatus.REJECTED,
      rejectedReason: payload.reason,
      moderatedBy: adminId,
    },
    include: reviewInclude,
  });

  return result;
};

const calculateNewAverageRating = async (
  mediaId: string,
  newRating: number,
) => {
  const reviews = await prisma.review.findMany({
    where: { mediaId, status: ReviewStatus.APPROVED },
    select: { rating: true },
  });

  if (reviews.length === 0) return newRating;

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
};

const toggleLikeReviewIntoDB = async (reviewId: string, userId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const existingLike = await prisma.reviewLike.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });

  if (existingLike) {
    await prisma.$transaction([
      prisma.reviewLike.delete({
        where: { id: existingLike.id },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false, likesCount: review.likesCount - 1 };
  } else {
    await prisma.$transaction([
      prisma.reviewLike.create({
        data: { userId, reviewId },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likesCount: review.likesCount + 1 };
  }
};

export const ReviewService = {
  getAllApprovedReviewsFromDB,
  getPendingReviewsFromDB,
  getReviewByIdFromDB,
  getMediaReviewsFromDB,
  createReviewIntoDB,
  updateReviewIntoDB,
  deleteReviewFromDB,
  approveReviewIntoDB,
  rejectReviewIntoDB,
  toggleLikeReviewIntoDB,
};
