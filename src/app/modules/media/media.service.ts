import status from "http-status";
import { Media, Prisma } from "../../../generated/prisma/client";
import { AuditAction } from "../../../generated/prisma/enums";
import AppError from "../../errorhandlers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { slugify } from "../../utils/slugify";
import { ICreateMediaPayload, IUpdateMediaPayload } from "./media.type";

const createMediaIntoDB = async (
  adminId: string,
  payload: ICreateMediaPayload,
) => {
  const { genres, platforms, castMembers, directors, tags, ...mediaData } =
    payload;

  const slug = slugify(mediaData.title);

  const existingMedia = await prisma.media.findUnique({
    where: { slug },
  });

  const finalSlug = existingMedia
    ? `${slug}-${Math.floor(Math.random() * 1000)}`
    : slug;

  const filteredMediaData = Object.fromEntries(
    Object.entries(mediaData).filter(([_, v]) => v !== undefined),
  );

  const result = await prisma.$transaction(async (tx) => {
    const media = await tx.media.create({
      data: {
        ...(filteredMediaData as any),
        slug: finalSlug,
        genres: {
          create: genres.map((genre: any) => ({ genre })),
        },
        ...(platforms && {
          platforms: {
            create: platforms.map((p: any) => ({
              platform: p.platform,
              streamUrl: p.streamUrl,
            })),
          },
        }),
        ...(castMembers && {
          castMembers: {
            create: castMembers.map((c: any, index: number) => ({
              ...c,
              orderIndex: index,
            })),
          },
        }),
        ...(directors && {
          directors: {
            create: directors.map((d: any) => ({
              ...d,
            })),
          },
        }),
      },
    });

    if (tags) {
      for (const tagName of tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, slug: slugify(tagName) },
        });

        await tx.mediaTag.create({
          data: {
            mediaId: media.id,
            tagId: tag.id,
          },
        });
      }
    }

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
    searchableFields: ["title", "synopsis", "slug", "synopsis"],
    filterableFields: [
      "type",
      "pricingType",
      "status",
      "releaseYear",
      "isFeatured",
      "isTrending",
      "isEditorsPick",
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
  >(
    prisma.media,
    {},
    {
      searchableFields: [],
      filterableFields: [],
    },
  )
    .search()
    .where({
      slug,
    })
    .filter()
    .sort()
    .include({
      genres: {
        select: {
          id: true,
          genre: true,
        },
      },
      platforms: {
        select: {
          id: true,
          platform: true,
          streamUrl: true,
        },
      },
      castMembers: {
        select: {
          id: true,
          actorName: true,
          character: true,
          profileUrl: true,
          orderIndex: true,
        },
      },
      directors: {
        select: {
          id: true,
          directorName: true,
          profileUrl: true,
        },
      },
      tags: {
        select: {
          id: true,
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
            },
          },
        },
      },
    })
    .execute();

  if (!mediaQuery) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  return mediaQuery;
};

const updateMediaInDB = async (
  adminId: string,
  mediaId: string,
  payload: IUpdateMediaPayload,
) => {
  const { genres, platforms, castMembers, directors, tags, ...mediaData } =
    payload;

  const isMediaExists = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!isMediaExists) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  // Filter out undefined values to satisfy exactOptionalPropertyTypes
  const filteredMediaData = Object.fromEntries(
    Object.entries(mediaData).filter(([_, v]) => v !== undefined),
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update basic fields
    const updatedMedia = await tx.media.update({
      where: { id: mediaId },
      data: {
        ...filteredMediaData,
        updatedAt: new Date(),
      },
    });

    // 2. Update relations if provided
    if (genres) {
      await tx.mediaGenre.deleteMany({ where: { mediaId } });
      await tx.mediaGenre.createMany({
        data: genres.map((genre: any) => ({ mediaId, genre })),
      });
    }

    if (platforms) {
      await tx.mediaPlatform.deleteMany({ where: { mediaId } });
      await tx.mediaPlatform.createMany({
        data: platforms.map((p: any) => ({
          mediaId,
          platform: p.platform,
          streamUrl: p.streamUrl,
        })),
      });
    }

    if (castMembers) {
      await tx.mediaCast.deleteMany({ where: { mediaId } });
      await tx.mediaCast.createMany({
        data: castMembers.map((c: any, index: number) => ({
          mediaId,
          ...c,
          orderIndex: index,
        })),
      });
    }

    if (directors) {
      await tx.mediaDirector.deleteMany({ where: { mediaId } });
      await tx.mediaDirector.createMany({
        data: directors.map((d: any) => ({
          mediaId,
          ...d,
        })),
      });
    }

    if (tags) {
      await tx.mediaTag.deleteMany({ where: { mediaId } });
      for (const tagName of tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, slug: slugify(tagName) },
        });

        await tx.mediaTag.create({
          data: {
            mediaId,
            tagId: tag.id,
          },
        });
      }
    }

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

  if (!isMediaExists) {
    throw new AppError(status.NOT_FOUND, "Media not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.media.delete({
      where: { id: mediaId },
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

export const MediaService = {
  createMediaIntoDB,
  getAllMediaFromDB,
  getMediaBySlugFromDB,
  updateMediaInDB,
  deleteMediaFromDB,
};
