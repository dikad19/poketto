-- AlterTable
ALTER TABLE "exp_events" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "transactions_createdById_createdAt_idx" ON "transactions"("createdById", "createdAt");
UPDATE "user_progress"
SET "lastWeeklyKey" = to_char(date_trunc('week', now() AT TIME ZONE 'Asia/Jakarta')::date - 7, 'YYYY-MM-DD')
WHERE "lastWeeklyKey" IS NULL;