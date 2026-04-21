import status from "http-status";
import { Prisma, Watchlist } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

const getUserWatchlistFromDB = async (userId: string, query: IQueryParams) => {
  const watchlistQuery = new QueryBuilder<
    Watchlist,
    Prisma.WatchlistWhereInput,
    Prisma.WatchlistInclude
  >(prisma.watchlist, query, {
    searchableFields: ["media.title", "media.slug", "media.synopsis"],
    filterableFields: ["media.type", "media.releaseYear", "media.ageRating"],
  })
    .filter()
    .where({ userId })
    .sort()
    .paginate()
    .include({
      media: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          releaseYear: true,
          youtubeStreamUrl: true,
        },
      },
    });

  return await watchlistQuery.execute();
};

const addToWatchlistDB = async (userId: string, mediaId: string) => {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  const existing = await prisma.watchlist.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });

  if (existing) {
    throw new AppError(status.BAD_REQUEST, "Media already in watchlist");
  }

  const result = await prisma.watchlist.create({
    data: { userId, mediaId },
    include: {
      media: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          releaseYear: true,
        },
      },
    },
  });

  return result;
};

const removeFromWatchlistDB = async (userId: string, mediaId: string) => {
  const existing = await prisma.watchlist.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Media not in watchlist");
  }

  await prisma.watchlist.delete({
    where: { userId_mediaId: { userId, mediaId } },
  });
};

export const WatchlistService = {
  getUserWatchlistFromDB,
  addToWatchlistDB,
  removeFromWatchlistDB,
};
