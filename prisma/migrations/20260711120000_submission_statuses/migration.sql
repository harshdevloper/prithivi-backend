-- AlterEnum: new review outcomes (safe — values are only added, not yet used)
ALTER TYPE "SubmissionStatus" ADD VALUE 'NEED_MORE_PROOF';
ALTER TYPE "SubmissionStatus" ADD VALUE 'CANCELLED';
