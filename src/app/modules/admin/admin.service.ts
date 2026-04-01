import status from "http-status";
import {
  AuditAction,
  MediaType,
  PaymentStatus,
  ReportStatus,
  ReviewStatus,
  Role,
  SubscriptionPlan,
} from "../../../generated/prisma/enums";
import AppError from "../../errorhandlers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IAdminCreatePayload } from "./admin.type";

const createAdminIntoDB = async (payload: IAdminCreatePayload) => {
  const { name, email, password } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "User with this email already exists");
  }

  const userData = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      role: Role.ADMIN,
    },
  });

  if (!userData || !userData.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create admin user",
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userData.user.id },
        data: {
          emailVerified: true,
        },
      });

      const admin = await tx.admin.create({
        data: {
          userId: userData.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      return admin;
    });

    return result;
  } catch (error) {
    await prisma.user.delete({
      where: {
        id: userData.user.id,
      },
    });
    throw error;
  }
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalMedia,
    movies,
    series,
    revenue,
    pendingReviews,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: false } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.media.count(),
    prisma.media.count({ where: { type: MediaType.MOVIE } }),
    prisma.media.count({ where: { type: MediaType.SERIES } }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: { amount: true },
    }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
  ]);

  const monthlyRevenue = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.SUCCEEDED,
      plan: SubscriptionPlan.MONTHLY,
    },
    _sum: { amount: true },
  });

  const yearlyRevenue = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.SUCCEEDED,
      plan: SubscriptionPlan.YEARLY,
    },
    _sum: { amount: true },
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
    },
    media: {
      total: totalMedia,
      movies,
      series,
    },
    revenue: {
      total: revenue._sum.amount || 0,
      monthly: monthlyRevenue._sum.amount || 0,
      yearly: yearlyRevenue._sum.amount || 0,
    },
    pending: {
      reviews: pendingReviews,
      reports: pendingReports,
    },
  };
};

const getAllUsers = async (query: Record<string, any>) => {
  const userQuery = new QueryBuilder(prisma.user, query, {
    searchableFields: ["name", "email", "phoneNumber"],
    filterableFields: ["role", "isActive", "isBanned"],
  })
    .search()
    .filter()
    .where({
      role: { notIn: [Role.ADMIN, Role.SUPER_ADMIN] },
    })
    .sort()
    .paginate()
    .include({
      subscription: true,
    });

  return await userQuery.execute();
};

const getAllAdmins = async (query: Record<string, any>) => {
  const userQuery = new QueryBuilder(prisma.user, query, {
    searchableFields: ["name", "email", "phoneNumber"],
    filterableFields: ["role", "isActive", "isBanned"],
  })
    .search()
    .filter()
    .where({
      role: { not: Role.USER },
    })
    .sort()
    .paginate()
    .include({
      subscription: true,
    });

  return await userQuery.execute();
};

const banUnbanUser = async (
  adminId: string,
  userId: string,
  payload: { isBanned: boolean; bannedReason?: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        isActive: !payload.isBanned,
        isBanned: payload.isBanned,
        bannedReason: payload.isBanned
          ? (payload.bannedReason ?? "Not specified")
          : null,
        bannedAt: payload.isBanned ? new Date() : null,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: payload.isBanned
          ? AuditAction.USER_BANNED
          : AuditAction.USER_UNBANNED,
        targetId: userId,
        details: payload.isBanned
          ? `Banned user ${user.email}. Reason: ${payload.bannedReason}`
          : `Unbanned user ${user.email}`,
      },
    });

    return updatedUser;
  });

  return result;
};

const getAuditLogs = async (query: Record<string, any>) => {
  const auditQuery = new QueryBuilder(prisma.auditLog, query, {
    searchableFields: ["details", "targetId"],
    filterableFields: ["action", "adminId"],
  })
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      admin: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    });

  return await auditQuery.execute();
};

const getPaymentAnalytics = async (query: Record<string, any>) => {
  const paymentQuery = new QueryBuilder(prisma.payment, query, {
    searchableFields: ["stripePaymentIntentId", "description"],
    filterableFields: ["status", "currency", "plan"],
  })
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    });

  const result = await paymentQuery.execute();

  const stats = await prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  return { ...result, stats };
};

// TODO: check this route after payment is implemented
const refundPayment = async (
  adminId: string,
  paymentId: string,
  payload: { refundReason: string },
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  });

  if (!payment) {
    throw new AppError(status.NOT_FOUND, "Payment not found");
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    throw new AppError(status.BAD_REQUEST, "Payment already refunded");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: payload.refundReason,
        refundAmount: payment.amount,
      },
    });

    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId,
        action: AuditAction.SUBSCRIPTION_REFUNDED,
        targetId: paymentId,
        details: `Refunded payment ${paymentId}. Reason: ${payload.refundReason}`,
      },
    });

    return updatedPayment;
  });

  return result;
};

export const AdminService = {
  createAdminIntoDB,
  getDashboardStats,
  getAllUsers,
  banUnbanUser,
  getAuditLogs,
  getPaymentAnalytics,
  refundPayment,
  getAllAdmins,
};
