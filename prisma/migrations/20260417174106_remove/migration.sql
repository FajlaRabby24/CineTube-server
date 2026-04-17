/*
  Warnings:

  - You are about to drop the `media_cast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `media_director` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "media_cast" DROP CONSTRAINT "media_cast_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "media_director" DROP CONSTRAINT "media_director_mediaId_fkey";

-- DropTable
DROP TABLE "media_cast";

-- DropTable
DROP TABLE "media_director";
