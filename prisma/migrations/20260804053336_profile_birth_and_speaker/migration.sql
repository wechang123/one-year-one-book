-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('CHILD', 'PARENT');

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "quoteBy" "Speaker" NOT NULL DEFAULT 'CHILD';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bornOn" DATE,
ADD COLUMN     "dueOn" DATE;
