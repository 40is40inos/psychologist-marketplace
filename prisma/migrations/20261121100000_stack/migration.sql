-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleSub" TEXT;

-- AlterTable
ALTER TABLE "PsychologistProfile" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeReady" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_userId_idx" ON "LoginToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "PsychologistProfile_stripeAccountId_key" ON "PsychologistProfile"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search over profile text (src/lib/fts.ts uses the same
-- expression). "simple" config + accent folding works for Greek and English.
CREATE INDEX "PsychologistProfileTranslation_fts_idx" ON "PsychologistProfileTranslation" USING GIN (
  to_tsvector('simple', translate(lower("headline" || ' ' || "bio" || ' ' || coalesce("approach", '')), 'άέήίόύώϊϋΐΰς', 'αεηιουωιυιυσ'))
);
