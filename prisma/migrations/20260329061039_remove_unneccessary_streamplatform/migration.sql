/*
  Warnings:

  - The values [NETFLIX,DISNEY_PLUS,AMAZON_PRIME,HBO_MAX,APPLE_TV,HULU,PEACOCK,PARAMOUNT_PLUS,OTHER] on the enum `StreamingPlatform` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StreamingPlatform_new" AS ENUM ('YOUTUBE');
ALTER TABLE "media_platform" ALTER COLUMN "platform" TYPE "StreamingPlatform_new" USING ("platform"::text::"StreamingPlatform_new");
ALTER TYPE "StreamingPlatform" RENAME TO "StreamingPlatform_old";
ALTER TYPE "StreamingPlatform_new" RENAME TO "StreamingPlatform";
DROP TYPE "public"."StreamingPlatform_old";
COMMIT;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
