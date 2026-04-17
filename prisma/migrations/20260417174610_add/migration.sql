-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaType" ADD VALUE 'TRAILER';
ALTER TYPE "MediaType" ADD VALUE 'EPISODE';
ALTER TYPE "MediaType" ADD VALUE 'SHORT';
ALTER TYPE "MediaType" ADD VALUE 'FUNNY';
ALTER TYPE "MediaType" ADD VALUE 'SPORT';
ALTER TYPE "MediaType" ADD VALUE 'MOTIVATIONAL';
ALTER TYPE "MediaType" ADD VALUE 'EDUCATIONAL';
ALTER TYPE "MediaType" ADD VALUE 'OTHER';
