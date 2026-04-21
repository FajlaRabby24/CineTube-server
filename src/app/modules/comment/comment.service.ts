import status from "http-status";
import { NotificationType, Prisma } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorhandlers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

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

interface CommentData {
  data: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getCommentsByReviewFromDB = async (
  reviewId: string,
): Promise<CommentData> => {
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

const getUserCommentsFromDB = async (userId: string, query: IQueryParams) => {
  const commentQuery = new QueryBuilder<
    any,
    Prisma.CommentWhereInput,
    Prisma.CommentInclude
  >(prisma.comment as any, query, {
    searchableFields: ["content"],
    filterableFields: ["reviewId", "parentId"],
  })
    .filter()
    .where({ userId, isDeleted: false })
    .search()
    .sort()
    .paginate()
    .include({
      ...commentInclude,
      review: {
        select: {
          id: true,
          title: true,
          media: {
            select: {
              title: true,
            },
          },
        },
      },
    });

  return await commentQuery.execute();
};

const createCommentIntoDB = async (
  reviewId: string,
  userId: string,
  content: string,
) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const comment = await prisma.comment.create({
    data: {
      reviewId,
      userId,
      content,
    },
    include: commentInclude,
  });

  await prisma.review.update({
    where: { id: reviewId },
    data: { commentsCount: { increment: 1 } },
  });

  if (review.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: review.userId,
        type: NotificationType.COMMENT_RECEIVED,
        title: "New Comment on Your Review",
        message: `Someone commented on your review`,
        link: `/reviews/${reviewId}`,
      },
    });
  }

  return comment;
};

const createReplyIntoDB = async (
  commentId: string,
  userId: string,
  content: string,
) => {
  const parentComment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { replies: { select: { id: true } } },
  });

  if (!parentComment || parentComment.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  if (parentComment.parentId !== null) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot reply to a reply. Max 2 levels allowed.",
    );
  }

  const comment = await prisma.comment.create({
    data: {
      reviewId: parentComment.reviewId,
      userId,
      content,
      parentId: commentId,
    },
    include: commentInclude,
  });

  await prisma.review.update({
    where: { id: parentComment.reviewId },
    data: { commentsCount: { increment: 1 } },
  });

  if (parentComment.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: parentComment.userId,
        type: NotificationType.COMMENT_REPLIED,
        title: "New Reply on Your Comment",
        message: `Someone replied to your comment`,
        link: `/reviews/${parentComment.reviewId}`,
      },
    });
  }

  return comment;
};

const updateCommentIntoDB = async (
  userId: string,
  commentId: string,
  content: string,
) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment || comment.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  if (comment.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own comments");
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: commentInclude,
  });

  return updatedComment;
};

const deleteCommentIntoDB = async (
  commentId: string,
  userId: string,
  userRole: string,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      replies: {
        where: { isDeleted: false },
        select: { id: true },
      },
    },
  });

  if (!comment || comment.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
  const isOwner = comment.userId === userId;

  if (!isOwner && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own comments or be an admin",
    );
  }

  const activeRepliesCount = comment.replies.length;
  const totalToDelete = 1 + activeRepliesCount;

  await prisma.$transaction(async (tx) => {
    if (activeRepliesCount > 0) {
      // Soft delete parent and its active replies
      await tx.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });

      await tx.comment.updateMany({
        where: { parentId: commentId, isDeleted: false },
        data: { isDeleted: true },
      });
    } else {
      // Hard delete if no active replies
      await tx.comment.delete({ where: { id: commentId } });
    }

    // Atomic decrement of all hidden/deleted comments
    await tx.review.update({
      where: { id: comment.reviewId },
      data: { commentsCount: { decrement: totalToDelete } },
    });
  });
};

const toggleLikeCommentIntoDB = async (userId: string, commentId: string) => {
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
  getUserCommentsFromDB,
  createCommentIntoDB,
  createReplyIntoDB,
  updateCommentIntoDB,
  deleteCommentIntoDB,
  toggleLikeCommentIntoDB,
};
