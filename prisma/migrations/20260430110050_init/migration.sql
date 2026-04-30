/*
  Warnings:

  - You are about to drop the column `totalEpisodes` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `totalSeasons` on the `media` table. All the data in the column will be lost.
  - You are about to drop the `media_platform` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "media_platform" DROP CONSTRAINT "media_platform_mediaId_fkey";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "totalEpisodes",
DROP COLUMN "totalSeasons",
ADD COLUMN     "country" TEXT;

-- DropTable
DROP TABLE "media_platform";
