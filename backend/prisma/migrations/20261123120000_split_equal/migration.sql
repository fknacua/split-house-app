-- AlterEnum
ALTER TYPE "SplitMethod" ADD VALUE 'EQUAL';

-- AlterTable
ALTER TABLE "charge_group" DROP COLUMN "correctsMonth";
