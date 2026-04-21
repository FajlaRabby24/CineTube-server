import {
  Notification,
  NotificationType,
  Prisma,
} from "../../../generated/prisma/client";
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
    .paginate()
    .staticSelect(["id", "userId", "type", "title", "isRead", "createdAt"]);

  return await notificationQuery.execute();
};

const markAllAsReadFromDB = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const NotificationService = {
  createNotificationIntoDB,
  getUserNotificationsFromDB,
  markAllAsReadFromDB,
};
