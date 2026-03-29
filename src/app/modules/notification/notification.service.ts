import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

const getUserNotificationsFromDB = async (userId: string, query: IQueryParams) => {
  const notificationQuery = new QueryBuilder<
    Prisma.NotificationWhereInput,
    Prisma.NotificationWhereInput,
    Prisma.NotificationInclude
  >(prisma.notification, query, {
    searchableFields: [],
    filterableFields: ["isRead"],
  })
    .filter()
    .where({ userId })
    .sort()
    .paginate();

  return await notificationQuery.execute();
};

const markAllAsReadFromDB = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const markAsReadFromDB = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only read your own notifications");
  }

  const result = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return result;
};

export const NotificationService = {
  getUserNotificationsFromDB,
  markAllAsReadFromDB,
  markAsReadFromDB,
};
