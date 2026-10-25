import {
  parseHouseholdConfig,
  parseNotificationSettings,
  type BootstrapResponse,
} from "@splithouse/shared";
import { deriveSetupProgress } from "@/lib/setup-progress";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";

/** The slice of the Prisma client this module uses, so tests can pass an in-memory fake. */
export interface BootstrapDb extends ActiveMonthDb {
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
 * Builds the bootstrap response. Read-only: it does not open the month (Home does).
 * `currentMonth` is the active month, so a month started early counts as the current one.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @throws When the newest version has a `schemaVersion` this code does not know.
 */
export async function getBootstrap(db: BootstrapDb): Promise<BootstrapResponse> {
  const [version, settingsRow, activeMonth] = await Promise.all([
    db.householdVersion.findFirst({ orderBy: { startsFromMonth: "desc" } }),
    db.settings.findUnique({ where: { id: "singleton" } }),
    getActiveMonth(db),
  ]);
  const config = version ? parseHouseholdConfig(version.schemaVersion, version.config) : null;
  return {
    hasHousehold: version !== null,
    currentMonth: activeMonth,
    setupProgress: deriveSetupProgress(config),
    settings: { notifications: parseNotificationSettings(settingsRow?.notifications) },
  };
}
