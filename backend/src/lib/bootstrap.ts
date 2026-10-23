import { parseHouseholdConfig } from "@/lib/household/config";
import { currentMonth } from "@/lib/month";
import { parseNotificationSettings, type NotificationSettings } from "@/lib/settings";
import { deriveSetupProgress, type SetupStep } from "@/lib/setup-progress";

/** Body of `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export interface BootstrapResponse {
  /** A household version exists. False sends the app to first-run setup. */
  hasHousehold: boolean;
  /** Current billing month, `YYYY-MM`, in Asia/Singapore. */
  currentMonth: string;
  /** The first-run checklist, in display order. */
  setupProgress: SetupStep[];
  /** Notification toggles, used to rebuild the reminders on this phone. */
  settings: { notifications: NotificationSettings };
}

/** The slice of the Prisma client this module uses, so tests can pass an in-memory fake. */
export interface BootstrapDb {
  householdVersion: {
    findFirst(args: {
      orderBy: { startsFromMonth: "desc" };
    }): Promise<{ schemaVersion: number; config: unknown } | null>;
  };
  settings: {
    findUnique(args: { where: { id: string } }): Promise<{ notifications: unknown } | null>;
  };
}

/**
 * Builds the bootstrap response. Read-only: it does not open the month (Home's summary does).
 *
 * @param db - The Prisma client, or a fake in tests.
 * @throws When the newest version has a `schemaVersion` this code does not know.
 */
export async function getBootstrap(db: BootstrapDb): Promise<BootstrapResponse> {
  const [version, settingsRow] = await Promise.all([
    db.householdVersion.findFirst({ orderBy: { startsFromMonth: "desc" } }),
    db.settings.findUnique({ where: { id: "singleton" } }),
  ]);
  const config = version ? parseHouseholdConfig(version.schemaVersion, version.config) : null;
  return {
    hasHousehold: version !== null,
    currentMonth: currentMonth(),
    setupProgress: deriveSetupProgress(config),
    settings: { notifications: parseNotificationSettings(settingsRow?.notifications) },
  };
}
