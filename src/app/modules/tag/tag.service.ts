import status from "http-status";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const getAllTagsFromDB = async () => {
  const result = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { mediaTags: true, reviewTags: true },
      },
    },
  });

  return result;
};

const createTagIntoDB = async (payload: { name: string; slug: string }) => {
  const existing = await prisma.tag.findFirst({
    where: {
      OR: [{ name: payload.name }, { slug: payload.slug }],
    },
  });

  if (existing) {
    throw new AppError(
      status.BAD_REQUEST,
      "Tag with this name or slug already exists",
    );
  }

  const result = await prisma.tag.create({
    data: payload,
  });

  return result;
};

const deleteTagFromDB = async (tagId: string) => {
  const tag = await prisma.tag.findUnique({ where: { id: tagId } });

  if (!tag) {
    throw new AppError(status.NOT_FOUND, "Tag not found");
  }

  await prisma.tag.delete({ where: { id: tagId } });
};

export const TagService = {
  getAllTagsFromDB,
  createTagIntoDB,
  deleteTagFromDB,
};
