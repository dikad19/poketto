-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpSource" ADD VALUE 'DAILY_LOG_1';
ALTER TYPE "ExpSource" ADD VALUE 'DAILY_LOG_3';
ALTER TYPE "ExpSource" ADD VALUE 'WEEKLY_LOG';

-- AlterTable
ALTER TABLE "exp_events" ALTER COLUMN "currentSpend" SET DEFAULT 0,
ALTER COLUMN "previousSpend" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "user_progress" ADD COLUMN     "lastWeeklyKey" TEXT;
