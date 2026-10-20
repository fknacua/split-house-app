-- CreateEnum
CREATE TYPE "ChargeCategory" AS ENUM ('RENT', 'UTILITIES', 'AIRCON', 'RECURRING', 'ONE_OFF', 'CORRECTION');

-- CreateEnum
CREATE TYPE "SplitMethod" AS ENUM ('PER_SHARE', 'PER_UNIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('SHARED', 'PERSONAL');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('MONTHLY', 'NUDGE');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PARSED', 'NOT_PARSED', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SAVINGS_TRANSFER');

-- CreateTable
CREATE TABLE "person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsappE164" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_version" (
    "id" TEXT NOT NULL,
    "startsFromMonth" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "householdVersionId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "currentChargesCents" INTEGER NOT NULL,
    "billingPeriodStart" DATE,
    "billingPeriodEnd" DATE,
    "dueDate" DATE,
    "lines" JSONB NOT NULL,
    "parseStatus" "ParseStatus" NOT NULL,
    "paidCents" INTEGER,
    "paidOn" DATE,
    "paidNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_file" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "bill_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_draft" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "parsedJson" JSONB,
    "parseOk" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_group" (
    "id" TEXT NOT NULL,
    "scope" "Scope" NOT NULL,
    "splitMethod" "SplitMethod" NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "note" TEXT,
    "correctsMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "payViaPersonId" TEXT,
    "category" "ChargeCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATE,
    "billId" TEXT,
    "chargeGroupId" TEXT,
    "correctsMonth" TEXT,
    "householdVersionId" TEXT NOT NULL,
    "paidCents" INTEGER,
    "paidOn" DATE,
    "paidByPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_event" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "chargeId" TEXT,
    "renderedText" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "month" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "notifications" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "household_version_startsFromMonth_key" ON "household_version"("startsFromMonth");

-- CreateIndex
CREATE UNIQUE INDEX "month_month_key" ON "month"("month");

-- CreateIndex
CREATE INDEX "month_householdVersionId_idx" ON "month"("householdVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_month_key" ON "bill"("month");

-- CreateIndex
CREATE UNIQUE INDEX "bill_file_billId_key" ON "bill_file"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_draft_month_key" ON "bill_draft"("month");

-- CreateIndex
CREATE INDEX "charge_month_idx" ON "charge"("month");

-- CreateIndex
CREATE INDEX "charge_personId_month_idx" ON "charge"("personId", "month");

-- CreateIndex
CREATE INDEX "charge_billId_idx" ON "charge"("billId");

-- CreateIndex
CREATE INDEX "charge_chargeGroupId_idx" ON "charge"("chargeGroupId");

-- CreateIndex
CREATE INDEX "message_event_month_personId_idx" ON "message_event"("month", "personId");

-- CreateIndex
CREATE INDEX "task_month_idx" ON "task"("month");

-- AddForeignKey
ALTER TABLE "month" ADD CONSTRAINT "month_householdVersionId_fkey" FOREIGN KEY ("householdVersionId") REFERENCES "household_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_file" ADD CONSTRAINT "bill_file_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_payViaPersonId_fkey" FOREIGN KEY ("payViaPersonId") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_paidByPersonId_fkey" FOREIGN KEY ("paidByPersonId") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "charge_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_householdVersionId_fkey" FOREIGN KEY ("householdVersionId") REFERENCES "household_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_event" ADD CONSTRAINT "message_event_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_event" ADD CONSTRAINT "message_event_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
