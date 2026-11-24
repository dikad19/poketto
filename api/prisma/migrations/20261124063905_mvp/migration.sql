/*
  Warnings:

  - You are about to drop the column `parentId` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `canAddTransaction` on the `space_members` table. All the data in the column will be lost.
  - You are about to drop the column `canEditOthersTx` on the `space_members` table. All the data in the column will be lost.
  - You are about to drop the column `canInviteMembers` on the `space_members` table. All the data in the column will be lost.
  - You are about to drop the column `canManageBudgets` on the `space_members` table. All the data in the column will be lost.
  - You are about to drop the column `canManageWallets` on the `space_members` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `currentBalance` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[spaceId,name,type]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenHash]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `spaceId` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `expiresAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenHash` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_toWalletId_fkey";

-- DropIndex
DROP INDEX "categories_spaceId_parentId_name_type_key";

-- DropIndex
DROP INDEX "sessions_sessionToken_key";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "parentId",
ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "expires",
DROP COLUMN "sessionToken",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "space_members" DROP COLUMN "canAddTransaction",
DROP COLUMN "canEditOthersTx",
DROP COLUMN "canInviteMembers",
DROP COLUMN "canManageBudgets",
DROP COLUMN "canManageWallets";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "twoFactorEnabled",
DROP COLUMN "twoFactorSecret";

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "currentBalance";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "verification_tokens";

-- CreateIndex
CREATE UNIQUE INDEX "categories_spaceId_name_type_key" ON "categories"("spaceId", "name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
