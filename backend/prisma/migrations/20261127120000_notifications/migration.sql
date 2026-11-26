-- Notifications move into the database (Data Model "Notifications", Phase 14.6): the four Settings switches, the six
-- notification types with their copy, and the event FYIs. The old `settings` table, which held only the toggles, is
-- dropped once its values are carried over. The seeded rows match src/lib/notifications/rows.ts
-- (rows.test.ts reads this file to check it).

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'SCHEDULED', 'EXPIRED');

-- CreateTable
CREATE TABLE "notification_group" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_group_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "notification_type" (
    "key" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_type_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "notification_event" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fireAt" TIMESTAMP(3),

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_type_groupKey_idx" ON "notification_type"("groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_key_key" ON "notification_event"("key");

-- CreateIndex
CREATE INDEX "notification_event_status_idx" ON "notification_event"("status");

-- AddForeignKey
ALTER TABLE "notification_type" ADD CONSTRAINT "notification_type_groupKey_fkey" FOREIGN KEY ("groupKey") REFERENCES "notification_group"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_event" ADD CONSTRAINT "notification_event_typeKey_fkey" FOREIGN KEY ("typeKey") REFERENCES "notification_type"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: the four switches with their defaults (every one on except FYI updates).
INSERT INTO "notification_group" ("key", "label", "detail", "enabled", "sortOrder", "updatedAt") VALUES
    ('uploadBill', 'Upload utilities bill', '8:00 from the 1st until uploaded', true, 1, CURRENT_TIMESTAMP),
    ('collectPayments', 'Collect tenant payments', '8:00 from the day before each due date until paid', true, 2, CURRENT_TIMESTAMP),
    ('payBill', 'Pay utilities bill', '8:00 from the day before the due date until paid', true, 3, CURRENT_TIMESTAMP),
    ('fyi', 'FYI updates', 'Unusual bill, aircon servicing due, month settled · silent', false, 4, CURRENT_TIMESTAMP);

-- Carry the saved toggles over, read as the old reader did: a value that isn't a boolean keeps the default. Collect
-- tenant payments is on if either Collect rent or Payment checks was. With no `settings` row, nothing changes.
UPDATE "notification_group" AS g
SET "enabled" = CASE
        WHEN g."key" = 'collectPayments' THEN
            COALESCE(CASE WHEN jsonb_typeof(s."n" -> 'collectRent') = 'boolean' THEN (s."n" ->> 'collectRent')::boolean END, g."enabled")
            OR COALESCE(CASE WHEN jsonb_typeof(s."n" -> 'paymentChecks') = 'boolean' THEN (s."n" ->> 'paymentChecks')::boolean END, g."enabled")
        ELSE
            COALESCE(CASE WHEN jsonb_typeof(s."n" -> g."key") = 'boolean' THEN (s."n" ->> g."key")::boolean END, g."enabled")
    END
FROM (SELECT "notifications" AS "n" FROM "settings" WHERE "id" = 'singleton') AS s;

-- Seed: the six notifications, with the Tech Stack's copy. One rule per line.
INSERT INTO "notification_type" ("key", "groupKey", "kind", "rule", "updatedAt") VALUES
    ('uploadBill', 'uploadBill', 'deadline', '{"anchor":"upload-day","time":"08:00","stages":{"dueTomorrow":{"channel":"checks","title":"Upload {month}’s utilities bill","body":"It usually lands tomorrow. Tap to upload it once it’s in."},"dueToday":{"channel":"checks","title":"Upload {month}’s utilities bill","body":"It usually lands today. Tap to upload it."},"overdue":{"channel":"action","title":"Upload {month}’s utilities bill","body":"Not uploaded yet. Tap to upload it."}}}'::jsonb, CURRENT_TIMESTAMP),
    ('collectPayments', 'collectPayments', 'deadline', '{"anchor":"charge-due","time":"08:00","stages":{"dueTomorrow":{"channel":"checks","title":"Collect {amount} from {payer}","body":"{items}. Due tomorrow."},"dueToday":{"channel":"checks","title":"Collect {amount} from {payer}","body":"{items}. Due today."},"overdue":{"channel":"action","title":"Collect {amount} from {payer}","body":"{items}. Overdue since {due}."}}}'::jsonb, CURRENT_TIMESTAMP),
    ('payBill', 'payBill', 'deadline', '{"anchor":"bill-due","time":"08:00","stages":{"dueTomorrow":{"channel":"checks","title":"Pay utilities bill: collected {collected} of {total}","body":"Due tomorrow, {due}."},"dueToday":{"channel":"checks","title":"Pay utilities bill: collected {collected} of {total}","body":"Due today."},"overdue":{"channel":"action","title":"Pay utilities bill: collected {collected} of {total}","body":"Overdue since {due}."}}}'::jsonb, CURRENT_TIMESTAMP),
    ('airconDue', 'fyi', 'dated', '{"anchor":"last-aircon","offsetDays":90,"time":"08:00","channel":"fyi","title":"Aircon servicing due?","body":"It’s been 3 months since the last one."}'::jsonb, CURRENT_TIMESTAMP),
    ('monthSettled', 'fyi', 'event', '{"trigger":"month-settled","delay":"immediate","expiresAfterDays":3,"channel":"fyi","title":"{month} is settled","body":"Everyone has paid and the utilities bill is covered."}'::jsonb, CURRENT_TIMESTAMP),
    ('unusualBill', 'fyi', 'event', '{"trigger":"unusual-bill","delay":"immediate","expiresAfterDays":3,"channel":"fyi","title":"Unusual bill amount","body":"{month}’s {amount} bill is {change} than your recent bills."}'::jsonb, CURRENT_TIMESTAMP);

-- DropTable
DROP TABLE "settings";
