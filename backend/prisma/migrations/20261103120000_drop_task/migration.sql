-- DropForeignKey
ALTER TABLE "task" DROP CONSTRAINT "task_chargeId_fkey";

-- DropTable
DROP TABLE "task";

-- DropEnum
DROP TYPE "TaskType";

