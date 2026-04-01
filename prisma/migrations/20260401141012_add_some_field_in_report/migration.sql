-- DropForeignKey
ALTER TABLE "report" DROP CONSTRAINT "report_comment_fk";

-- DropForeignKey
ALTER TABLE "report" DROP CONSTRAINT "report_review_fk";

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "reviewId" TEXT;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
