/*
  Warnings:

  - The `status` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `Application` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'INTERVIEW', 'REJECTED_BY_COMPANY');

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "is_relevant" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "company" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING';
