import {
  parseHouseholdConfig,
  parseNotificationSettings,
  type BootstrapResponse,
} from "@splithouse/shared";
import { currentMonth } from "@/lib/month";
import { deriveSetupProgress } from "@/lib/setup-progress";

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
