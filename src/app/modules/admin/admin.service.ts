import status from "http-status";
import {
  AuditAction,
  MediaType,
  PaymentStatus,
  ReportStatus,
  ReviewStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorhandlers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { IAdminCreatePayload, IBanUnbanUserPayload } from "./admin.type";

const createAdminIntoDB = async (payload: IAdminCreatePayload) => {
  const { name, email, password } = payload;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "User with this email already exists");
  }

  // 2. Create User using better-auth
  const userData = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      // @ts-ignore
      role: Role.ADMIN,
    },
  });

  if (!userData || !userData.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create admin user",
    );
  }

  // 3. Create Admin record and update user status in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Mark email as verified for admin created by super admin
    await tx.user.update({
      where: { id: userData.user.id },
      data: { emailVerified: true },
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

const getAllUsers = async () => {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
    },
  });
};

const banUnbanUser = async (
  adminId: string,
  userId: string,
  payload: IBanUnbanUserPayload,
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
        bannedReason: payload.isBanned ? (payload.bannedReason ?? null) : null,
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

const getAuditLogs = async () => {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
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
    },
  });

  return auditLogs;
};

const getPaymentAnalytics = async () => {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const stats = await prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  return { payments, stats };
};

// TODO: check after complete payment integration
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

    // If it was a subscription payment, we might want to cancel/expire the subscription
    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED, // or whatever status fits
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
};
