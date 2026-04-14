/*
  Warnings:

  - You are about to drop the column `backdropUrl` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `posterUrl` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `trailerUrl` on the `media` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "media" DROP COLUMN "backdropUrl",
DROP COLUMN "posterUrl",
DROP COLUMN "trailerUrl";
