import status from "http-status";
import {
  NotificationType,
  Prisma,
  Report,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
} from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import { ICreateReportPaylod } from "./report.types";

const createReportIntoDB = async (
  userId: string,
  payload: ICreateReportPaylod,
) => {
  if (payload.targetType === ReportTargetType.REVIEW) {
    const review = await prisma.review.findUnique({
      where: { id: payload.targetId },
    });
    if (!review) {
      throw new AppError(status.NOT_FOUND, "Review not found");
    }
  } else if (payload.targetType === ReportTargetType.COMMENT) {
    const comment = await prisma.comment.findUnique({
      where: { id: payload.targetId },
    });
    if (!comment) {
      throw new AppError(status.NOT_FOUND, "Comment not found");
    }
  }

  const existingReport = await prisma.report.findFirst({
    where: {
      userId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      status: ReportStatus.PENDING,
    },
  });

  if (existingReport) {
    throw new AppError(
      status.BAD_REQUEST,
      "You have already reported this content",
    );
  }

  const reportData: any = {
    user: { connect: { id: userId } },
    targetType: payload.targetType,
    targetId: payload.targetId,
    reason: payload.reason,
    description: payload.description ?? null,
  };

  if (payload.targetType === ReportTargetType.REVIEW) {
    reportData.review = { connect: { id: payload.targetId } };
  } else if (payload.targetType === ReportTargetType.COMMENT) {
    reportData.comment = { connect: { id: payload.targetId } };
  }

  const result = await prisma.report.create({
    data: reportData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return result;
};

const getPendingReportsFromDB = async (query: IQueryParams) => {
  const reportQuery = new QueryBuilder<
    Report,
    Prisma.ReportWhereInput,
    Prisma.ReportInclude
  >(prisma.report, query, {
    searchableFields: [],
    filterableFields: ["targetType", "reason"],
  })
    .filter()
    .where({ status: ReportStatus.PENDING })
    .sort()
    .paginate()
    .include({
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      review: {
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
      comment: {
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
    });

  return await reportQuery.execute();
};

const resolveReportFromDB = async (
  adminId: string,
  reportId: string,
  resolution: string,
) => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Report not found");
  }

  if (report.status !== ReportStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, "Report is not pending");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolution,
      },
    });

    if (report.targetType === ReportTargetType.REVIEW) {
      await tx.review.update({
        where: { id: report.targetId },
        data: { status: ReviewStatus.REJECTED },
      });
    } else if (report.targetType === ReportTargetType.COMMENT) {
      await tx.comment.delete({
        where: { id: report.targetId },
      });
    }

    await tx.notification.create({
      data: {
        userId: report.userId,
        type: NotificationType.REPORT_RESOLVED,
        title: "Your Report has been Resolved",
        message: `Your report has been resolved. Resolution: ${resolution}`,
      },
    });

    return updatedReport;
  });

  return result;
};

const dismissReportFromDB = async (adminId: string, reportId: string) => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Report not found");
  }

  if (report.status !== ReportStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, "Report is not pending");
  }

  const result = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.DISMISSED,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    },
  });

  return result;
};

export const ReportService = {
  createReportIntoDB,
  getPendingReportsFromDB,
  resolveReportFromDB,
  dismissReportFromDB,
};
