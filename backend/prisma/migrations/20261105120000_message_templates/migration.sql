-- Message wording leaves the household version: one current record, applied immediately.
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "templates" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- Only schema version 2 rows move. Production still holds version 1 rows under older code, which keep working
-- untouched until its wipe and reload (Phase 9's "No migration"), so nothing here may rewrite them.
-- The newest version holds the latest saved wording. With no row, the code's defaults apply.
INSERT INTO "message_templates" ("id", "templates", "updatedAt")
SELECT 'singleton', "config"->'templates', CURRENT_TIMESTAMP
FROM "household_version"
WHERE "schemaVersion" = 2
ORDER BY "startsFromMonth" DESC
LIMIT 1;

-- Household schema version 3: the config no longer holds templates.
UPDATE "household_version"
SET "config" = "config" - 'templates', "schemaVersion" = 3
WHERE "schemaVersion" = 2;
