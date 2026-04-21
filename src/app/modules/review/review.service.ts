import status from "http-status";
import {
  AuditAction,
  NotificationType,
  Prisma,
  Review,
  ReviewStatus,
} from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import {
  ICreateReviewPayload,
  IRejectReviewPayload,
  IUpdateReviewPayload,
} from "./review.type.js";

const getAllReviewsForAdminFromDB = async (query: IQueryParams) => {
  const reviewQuery = new QueryBuilder<
    Review,
    Prisma.ReviewWhereInput,
    Prisma.ReviewInclude
  >(prisma.review, query, {
    searchableFields: ["content", "title", "user.name", "media.title"],
    filterableFields: ["status", "rating", "hasSpoiler", "userId", "mediaId"],
  })
    .filter()
    .search()
    .sort()
    .paginate()
    .include({
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
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    });

  return await reviewQuery.execute();
};

const getUserReviewsFromDB = async (userId: string, query: IQueryParams) => {
  const reviewQuery = new QueryBuilder<
    Review,
    Prisma.ReviewWhereInput,
    Prisma.ReviewInclude
  >(prisma.review, query, {
    searchableFields: ["content", "title", "media.title"],
    filterableFields: ["status", "rating", "hasSpoiler", "mediaId"],
  })

    .filter()
    .where({ userId })
    .search()
    .sort()
    .paginate()
    .include({
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
        },
      },
      comments: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    });

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
    .include({
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
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    });

  return await reviewQuery.execute();
};

const getReviewByIdFromDB = async (id: string) => {
  const result = await prisma.review.findUnique({
    where: { id },
    include: {
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
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
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
    .include({
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
        },
      },
      comments: {
        select: {
          id: true,
          content: true,
          likesCount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    });

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
      status: ReviewStatus.APPROVED,
    },
    include: {
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
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
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
    include: {
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
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  return result;
};

const deleteReviewFromDB = async (reviewId: string, userId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own reviews",
    );
  }

  await prisma.review.delete({ where: { id: reviewId } });
};

const deleteReviewByAdminFromDB = async (reviewId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  await prisma.review.delete({ where: { id: reviewId } });
};

const approveReviewIntoDB = async (reviewId: string, adminId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

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
      where: { id: reviewId },
      data: {
        status: ReviewStatus.APPROVED,
        publishedAt: new Date(),
        moderatedBy: adminId,
      },
      include: {
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
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    }),
    prisma.media.update({
      where: { id: review.mediaId },
      data: {
        totalReviews: { increment: 1 },
        averageRating: { set: averageRating },
      },
    }),
    prisma.auditLog.create({
      data: {
        adminId,
        action: AuditAction.REVIEW_APPROVED,
        targetId: reviewId,
        details: `Approved review for media: ${review.mediaId}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: review.userId,
        type: NotificationType.REVIEW_APPROVED,
        title: "Your Review has been Approved",
        message:
          "Congratulations! Your review has been approved and is now visible to the public.",
        link: `/reviews/${reviewId}`,
      },
    }),
  ]);

  return updatedReview;
};

const rejectReviewIntoDB = async (
  reviewId: string,
  adminId: string,
  payload: IRejectReviewPayload,
) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.status === ReviewStatus.REJECTED) {
    throw new AppError(status.BAD_REQUEST, "Review is already rejected");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.REJECTED,
        rejectedReason: payload.reason,
        moderatedBy: adminId,
      },
      include: {
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
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: AuditAction.REVIEW_REJECTED,
        targetId: reviewId,
        details: `Rejected review for media: ${review.mediaId}. Reason: ${payload.reason}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: review.userId,
        type: NotificationType.REVIEW_REJECTED,
        title: "Your Review has been Rejected",
        message: `Your review was rejected. Reason: ${payload.reason}`,
        link: `/reviews/${reviewId}`,
      },
    });

    return updated;
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
    where: {
      userId_reviewId: {
        userId,
        reviewId,
      },
    },
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
      // Create notification for the review author
      ...(review.userId !== userId
        ? [
            prisma.notification.create({
              data: {
                userId: review.userId,
                type: NotificationType.REVIEW_LIKED,
                title: "New Review Appreciation",
                message: "Someone appreciated your cinematic analysis.",
                link: `/reviews/${reviewId}`,
              },
            }),
          ]
        : []),
    ]);
    return { liked: true, likesCount: review.likesCount + 1 };
  }
};

export const ReviewService = {
  getAllReviewsForAdminFromDB,
  getUserReviewsFromDB,
  getPendingReviewsFromDB,
  getReviewByIdFromDB,
  getMediaReviewsFromDB,
  createReviewIntoDB,
  updateReviewIntoDB,
  deleteReviewFromDB,
  deleteReviewByAdminFromDB,
  approveReviewIntoDB,
  rejectReviewIntoDB,
  toggleLikeReviewIntoDB,
};
