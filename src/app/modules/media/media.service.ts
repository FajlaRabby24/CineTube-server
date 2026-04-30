import status from "http-status";
import { Media, Prisma, AuditAction, Genre } from "../../../generated/prisma";
import AppError from "../../errorhandlers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { slugify } from "../../utils/slugify";
import { ICreateMediaPayload, IUpdateMediaPayload } from "./media.type";

const createMediaIntoDB = async (
  adminId: string,
  payload: ICreateMediaPayload,
) => {
  const { genres, tags, ...mediaData } = payload;

  const slug = slugify(mediaData.title);

  const existingMedia = await prisma.media.findUnique({
    where: { slug },
  });

  const finalSlug = existingMedia
    ? `${slug}-${Math.floor(Math.random() * 1000)}`
    : slug;

  const filteredMediaData = Object.fromEntries(
    Object.entries(mediaData).filter(([_, v]) => v !== undefined && v !== null),
  );

  const result = await prisma.$transaction(async (tx) => {
    const media = await tx.media.create({
      data: {
        ...(filteredMediaData as any),
        slug: finalSlug,
        genres: {
          create: genres.map((genre: any) => ({ genre })),
        },
      },
    });

    if (tags) {
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await tx.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await tx.mediaTag.create({
          data: {
            mediaId: media.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Ensure admin record exists to prevent audit log failure
    await tx.admin.upsert({
      where: { userId: adminId },
      update: {},
      create: { userId: adminId },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: AuditAction.MEDIA_CREATED,
        targetId: media.id,
        details: `Created media: ${media.title}`,
      },
    });

    return media;
  });

  return result;
};

const getAllMediaFromDB = async (query: Record<string, any>) => {
  const mediaQuery = new QueryBuilder<
    Media,
    Prisma.MediaWhereInput,
    Prisma.MediaInclude
  >(prisma.media, query, {
    searchableFields: ["title", "synopsis", "slug"],
    filterableFields: [
      "type",
      "pricingType",
      "status",
      "isFeatured",
      "isTrending",
      "isEditorsPick",
      "averageRating",
    ],
    someRelationEnumFields: [
      {
        field: "genres.genre",
        enumValues: Object.values(Genre),
      },
    ],
  })
    .search()
    .filter()
    .sort()
    .paginate()
    .staticSelect([
      "id",
      "slug",
      "title",
      "youtubeStreamUrl",
      "status",
      "type",
      "averageRating",
      "releaseYear",
      "pricingType",
    ]);

  return await mediaQuery.execute();
};

const getMediaBySlugFromDB = async (slug: string) => {
  const mediaQuery = new QueryBuilder<
    Media,
    Prisma.MediaWhereInput,
    Prisma.MediaInclude
  >(prisma.media, {}, { searchableFields: [], filterableFields: [] })
    .search()
    .where({ slug })
    .filter()
    .sort()
    .include({
      genres: { select: { id: true, genre: true } },
      tags: {
        select: {
          id: true,
          tag: { select: { id: true, name: true, slug: true, createdAt: true } },
        },
      },
    })
    .execute();

  if (!mediaQuery) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  return mediaQuery;
};

const getMediaByIdFromDB = async (mediaId: string) => {
  const mediaQuery = new QueryBuilder<
    Media,
    Prisma.MediaWhereInput,
    Prisma.MediaInclude
  >(prisma.media, {}, { searchableFields: [], filterableFields: [] })
    .search()
    .where({ id: mediaId })
    .filter()
    .sort()
    .include({
      genres: { select: { id: true, genre: true } },
      tags: {
        select: {
          id: true,
          tag: { select: { id: true, name: true, slug: true, createdAt: true } },
        },
      },
    })
    .execute();

  if (!mediaQuery) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  return mediaQuery;
};

const addViewsInDB = async (mediaId: string) => {
  const isMediaExists = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!isMediaExists) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  const result = await prisma.media.update({
    where: { id: mediaId },
    data: { totalViews: isMediaExists.totalViews + 1 },
    select: { id: true, title: true, totalViews: true },
  });

  return result;
};

const toggleLikeMediaInDB = async (
  mediaId: string,
  userId: string,
  type: "LIKE" | "DISLIKE",
) => {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new AppError(status.NOT_FOUND, "Media not found");

  const existingVote = await prisma.mediaVote.findUnique({
    where: { mediaId_userId: { mediaId, userId } },
  });

  return await prisma.$transaction(async (tx) => {
    if (existingVote) {
      if (existingVote.type === type) {
        await tx.mediaVote.delete({ where: { id: existingVote.id } });
        return tx.media.update({
          where: { id: mediaId },
          data:
            type === "LIKE"
              ? { totalLikes: { decrement: 1 } }
              : { totalDislikes: { decrement: 1 } },
          select: {
            id: true,
            title: true,
            totalLikes: true,
            totalDislikes: true,
          },
        });
      } else {
        await tx.mediaVote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return tx.media.update({
          where: { id: mediaId },
          data: {
            totalLikes: type === "LIKE" ? { increment: 1 } : { decrement: 1 },
            totalDislikes:
              type === "DISLIKE" ? { increment: 1 } : { decrement: 1 },
          },
          select: {
            id: true,
            title: true,
            totalLikes: true,
            totalDislikes: true,
          },
        });
      }
    } else {
      await tx.mediaVote.create({ data: { mediaId, userId, type } });
      return tx.media.update({
        where: { id: mediaId },
        data:
          type === "LIKE"
            ? { totalLikes: { increment: 1 } }
            : { totalDislikes: { increment: 1 } },
        select: { id: true, title: true, totalLikes: true, totalDislikes: true },
      });
    }
  });
};

const updateMediaInDB = async (
  adminId: string,
  mediaId: string,
  payload: IUpdateMediaPayload,
) => {
  const { genres, tags, ...mediaData } = payload;

  const isMediaExists = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!isMediaExists) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  const filteredMediaData = Object.fromEntries(
    Object.entries(mediaData).filter(([_, v]) => v !== undefined && v !== null),
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedMedia = await tx.media.update({
      where: { id: mediaId },
      data: { ...filteredMediaData, updatedAt: new Date() },
    });

    if (genres) {
      await tx.mediaGenre.deleteMany({ where: { mediaId } });
      await tx.mediaGenre.createMany({
        data: genres.map((genre: any) => ({ mediaId, genre })),
      });
    }

    if (tags) {
      await tx.mediaTag.deleteMany({ where: { mediaId } });
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await tx.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await tx.mediaTag.create({ data: { mediaId, tagId: tag.id } });
      }
    }

    // Ensure admin record exists to prevent audit log failure
    await tx.admin.upsert({
      where: { userId: adminId },
      update: {},
      create: { userId: adminId },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: AuditAction.MEDIA_UPDATED,
        targetId: mediaId,
        details: `Updated media: ${isMediaExists.title}`,
      },
    });

    return updatedMedia;
  });

  return result;
};

const deleteMediaFromDB = async (adminId: string, mediaId: string) => {
  const isMediaExists = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!isMediaExists) throw new AppError(status.NOT_FOUND, "Media not found");

  await prisma.$transaction(async (tx) => {
    await tx.media.delete({ where: { id: mediaId } });
    // Ensure admin record exists to prevent audit log failure
    await tx.admin.upsert({
      where: { userId: adminId },
      update: {},
      create: { userId: adminId },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: AuditAction.MEDIA_DELETED,
        targetId: mediaId,
        details: `Deleted media: ${isMediaExists.title}`,
      },
    });
  });

  return null;
};

const getUserVoteStatusFromDB = async (mediaId: string, userId: string) => {
  const vote = await prisma.mediaVote.findUnique({
    where: { mediaId_userId: { mediaId, userId } },
    select: { type: true },
  });
  return { userVote: vote?.type || null };
};

export const MediaService = {
  createMediaIntoDB,
  getAllMediaFromDB,
  getMediaBySlugFromDB,
  getMediaByIdFromDB,
  updateMediaInDB,
  deleteMediaFromDB,
  toggleLikeMediaInDB,
  getUserVoteStatusFromDB,
  addViewsInDB,
};
