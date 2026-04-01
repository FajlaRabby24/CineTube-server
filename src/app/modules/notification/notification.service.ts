import status from "http-status";
import { Notification, Prisma, NotificationType } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

const createNotificationIntoDB = async (data: CreateNotificationPayload) => {
  return await prisma.notification.create({ data });
};

const getUserNotificationsFromDB = async (
  userId: string,
  query: IQueryParams,
) => {
  const notificationQuery = new QueryBuilder<
    Notification,
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

const markAsReadFromDB = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only read your own notifications",
    );
  }

  const result = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return result;
};

export const NotificationService = {
  createNotificationIntoDB,
  getUserNotificationsFromDB,
  markAllAsReadFromDB,
  markAsReadFromDB,
};
