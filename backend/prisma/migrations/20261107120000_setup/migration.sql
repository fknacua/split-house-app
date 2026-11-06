-- First run's progress: the start month and the steps recorded as done.
CREATE TABLE "setup" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "startMonth" TEXT,
    "doneSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_pkey" PRIMARY KEY ("id")
);
