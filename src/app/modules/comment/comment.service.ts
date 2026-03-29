import status from "http-status";
import AppError from "../../errorhandlers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";

const commentInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  _count: {
    select: {
      likes: true,
      replies: true,
    },
  },
};

const getCommentsByReviewFromDB = async (reviewId: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const comments = await prisma.comment.findMany({
    where: {
      reviewId,
      isDeleted: false,
      parentId: null,
    },
    include: commentInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    data: comments,
    meta: { page: 1, limit: 10, total: comments.length, totalPages: 1 },
  };
};

const toggleLikeCommentIntoDB = async (commentId: string, userId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment || comment.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  const existingLike = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existingLike) {
    await prisma.$transaction([
      prisma.commentLike.delete({
        where: { id: existingLike.id },
      }),
      prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false, likesCount: comment.likesCount - 1 };
  } else {
    await prisma.$transaction([
      prisma.commentLike.create({
        data: { userId, commentId },
      }),
      prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likesCount: comment.likesCount + 1 };
  }
};

export const CommentService = {
  getCommentsByReviewFromDB,
  toggleLikeCommentIntoDB,
};
