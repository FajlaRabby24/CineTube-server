/*
  Warnings:

  - Made the column `targetId` on table `report` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "report" ALTER COLUMN "targetId" SET NOT NULL;
