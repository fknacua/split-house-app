import { addMonths, parseHouseholdConfig, type SettingsResponse } from "@splithouse/shared";
import { buildSettings } from "@/lib/settings/build-settings";
import { getActiveMonth, type ActiveMonthDb } from "@/services/months/active-month.service";
import { readMessageTemplates, type MessageTemplatesDb } from "@/services/templates/message-templates.service";

const VERSION_SELECT = { startsFromMonth: true, schemaVersion: true, config: true } as const;

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface SettingsDb extends ActiveMonthDb, MessageTemplatesDb {
  householdVersion: {
    findMany(args: {
      orderBy: { startsFromMonth: "desc" };
      select: typeof VERSION_SELECT;
    }): Promise<{ startsFromMonth: string; schemaVersion: number; config: unknown }[]>;
  };
}

/**
 * Reads the Settings screen. The Messages rows count the custom versions of the people in next month's household.
 * Before first run there is nobody to count, and the screen still answers so the Account card and Sign out stay
 * reachable. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param email - The signed-in account's email.
 * @returns The Settings screen.
 */
export async function getSettings(db: SettingsDb, email: string): Promise<SettingsResponse> {
  const [activeMonth, versions, templates] = await Promise.all([
    getActiveMonth(db),
    db.householdVersion.findMany({ orderBy: { startsFromMonth: "desc" }, select: VERSION_SELECT }),
    readMessageTemplates(db),
  ]);
  const nextMonth = addMonths(activeMonth, 1);
  const version = versions.find((v) => v.startsFromMonth <= nextMonth);
  return buildSettings({
    email,
    config: version ? parseHouseholdConfig(version.schemaVersion, version.config) : null,
    templates,
  });
}
