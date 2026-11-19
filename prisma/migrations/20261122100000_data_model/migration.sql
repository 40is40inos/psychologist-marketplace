-- Section 11: data model. Hand-written so no data is lost:
-- TimeOff is renamed (not dropped), intake answers are copied into
-- IntakeForm before the Appointment columns go, and new tables are backfilled.

-- ── AvailabilityException (was TimeOff) ─────────────────────────────────────
CREATE TYPE "ExceptionKind" AS ENUM ('unavailable', 'available');

ALTER TABLE "TimeOff" RENAME TO "AvailabilityException";
ALTER TABLE "AvailabilityException" RENAME CONSTRAINT "TimeOff_pkey" TO "AvailabilityException_pkey";
ALTER TABLE "AvailabilityException" RENAME CONSTRAINT "TimeOff_psychologistId_fkey" TO "AvailabilityException_psychologistId_fkey";
ALTER INDEX "TimeOff_psychologistId_startsAt_idx" RENAME TO "AvailabilityException_psychologistId_startsAt_idx";
ALTER TABLE "AvailabilityException"
  ADD COLUMN "kind" "ExceptionKind" NOT NULL DEFAULT 'unavailable',
  ADD COLUMN "sessionTypes" "SessionType"[] DEFAULT ARRAY[]::"SessionType"[];

-- ── IntakeForm (moved out of Appointment) ───────────────────────────────────
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "answersEncrypted" TEXT NOT NULL,
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntakeForm_appointmentId_key" ON "IntakeForm"("appointmentId");
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ciphertext is copied as-is (same key), so nothing is decrypted here.
INSERT INTO "IntakeForm" ("id", "appointmentId", "answersEncrypted", "riskFlag", "submittedAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "intakeEncrypted", "intakeRisk", "createdAt", "updatedAt"
FROM "Appointment"
WHERE "intakeEncrypted" IS NOT NULL;

ALTER TABLE "Appointment" DROP COLUMN "intakeEncrypted", DROP COLUMN "intakeRisk";

-- ── ClientProfile ───────────────────────────────────────────────────────────
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredLanguage" TEXT,
    "preferredSessionType" "SessionType",
    "matchAnswersEncrypted" TEXT,
    "matchSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ClientProfile" ("id", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "createdAt", CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'client' AND "deletedAt" IS NULL;

-- ── LicenseVerification (history of licence checks) ─────────────────────────
CREATE TABLE "LicenseVerification" (
    "id" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licensingAuthority" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "decision" "VerificationStatus" NOT NULL,
    "note" TEXT,
    "reviewerId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseVerification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LicenseVerification_psychologistId_decidedAt_idx" ON "LicenseVerification"("psychologistId", "decidedAt");
ALTER TABLE "LicenseVerification" ADD CONSTRAINT "LicenseVerification_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "PsychologistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseVerification" ADD CONSTRAINT "LicenseVerification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Decisions already made become the first history entry.
INSERT INTO "LicenseVerification" ("id", "psychologistId", "licenseNumber", "licensingAuthority", "countryCode", "decision", "reviewerId", "decidedAt")
SELECT gen_random_uuid()::text, "id", "licenseNumber", "licensingAuthority", "countryCode", "verificationStatus", "verifiedById", COALESCE("verifiedAt", "updatedAt")
FROM "PsychologistProfile"
WHERE "verificationStatus" <> 'pending';
