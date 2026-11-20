-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('sign_in', 'password_reset', 'email_verify', 'email_change');

-- DropIndex
DROP INDEX "LoginToken_userId_idx";

-- AlterTable
ALTER TABLE "LoginToken" ADD COLUMN     "newEmail" TEXT,
ADD COLUMN     "purpose" "TokenPurpose" NOT NULL DEFAULT 'sign_in';

-- CreateIndex
CREATE INDEX "LoginToken_userId_purpose_idx" ON "LoginToken"("userId", "purpose");

