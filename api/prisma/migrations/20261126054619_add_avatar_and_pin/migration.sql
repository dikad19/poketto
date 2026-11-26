-- CreateEnum
CREATE TYPE "ExpSource" AS ENUM ('DAILY_QUEST', 'MONTHLY_QUEST');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "user_security" (
    "userId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" TIMESTAMP(3),
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_security_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "userId" TEXT NOT NULL,
    "totalExp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastDailyKey" TEXT,
    "lastMonthlyKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "exp_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ExpSource" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "exp" INTEGER NOT NULL,
    "currentSpend" DECIMAL(18,2) NOT NULL,
    "previousSpend" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exp_events_userId_createdAt_idx" ON "exp_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "exp_events_userId_source_periodKey_key" ON "exp_events"("userId", "source", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_level_key" ON "user_badges"("userId", "level");

-- AddForeignKey
ALTER TABLE "user_security" ADD CONSTRAINT "user_security_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exp_events" ADD CONSTRAINT "exp_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
