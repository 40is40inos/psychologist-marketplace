-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smsHideBrand" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "intakeRisk" BOOLEAN NOT NULL DEFAULT false;
