import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import type { StoredNotificationGroup } from "@/lib/notifications/groups";
import { NOTIFICATION_GROUP_ROWS } from "@/lib/notifications/rows";
import { getSettings, saveNotificationSwitch, type SettingsDb, type SettingsSaveDb } from "./settings.service";

const EMAIL = "owner@example.com";

const version = (startsFromMonth: string, config: HouseholdConfig) => ({
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

const WITH_OVERRIDE = {
  ...DEFAULT_MESSAGE_TEMPLATES,
  overrides: [{ personId: PERSON_IDS.jordan, kind: "MONTHLY" as const, text: "Hi {name}" }],
};

const WITHOUT_JORDAN: HouseholdConfig = {
  ...NOV_2026_CONFIG,
  people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan),
};

/** A household with the given versions, newest first as the service asks for them, and the saved wording. */
function fakeDb(versions: ReturnType<typeof version>[], templates: unknown = null): SettingsDb {
  return {
    messageTemplates: { findUnique: async () => (templates ? { templates } : null) },
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: { findMany: async () => versions },
    notificationGroup: { findMany: async () => NOTIFICATION_GROUP_ROWS.map((g) => ({ ...g })) },
  };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getSettings", () => {
  it("counts a saved custom version", async () => {
    const settings = await getSettings(fakeDb([version("2026-11", NOV_2026_CONFIG)], WITH_OVERRIDE), EMAIL);
    expect(settings.email).toBe(EMAIL);
    expect(settings.messages[0].detail).toBe("Custom templates: 1");
  });

  it("doesn't count someone who has left by next month", async () => {
    const settings = await getSettings(
      fakeDb([version("2026-12", WITHOUT_JORDAN), version("2026-11", NOV_2026_CONFIG)], WITH_OVERRIDE),
      EMAIL,
    );
    expect(settings.messages[0].detail).toBe("Same for everyone");
  });

  it("reads people from next month's version, not a later one", async () => {
    const settings = await getSettings(
      fakeDb([version("2027-01", WITHOUT_JORDAN), version("2026-11", NOV_2026_CONFIG)], WITH_OVERRIDE),
      EMAIL,
    );
    expect(settings.messages[0].detail).toBe("Custom templates: 1");
  });

  it("still answers before first run", async () => {
    const settings = await getSettings(fakeDb([]), EMAIL);
    expect(settings.email).toBe(EMAIL);
    expect(settings.messages.map((m) => m.detail)).toEqual(["Same for everyone", "Same for everyone"]);
  });

  it("throws for a version with an unknown schemaVersion instead of misreading it", async () => {
    const unknown = { ...version("2026-11", NOV_2026_CONFIG), schemaVersion: 999 };
    await expect(getSettings(fakeDb([unknown]), EMAIL)).rejects.toThrow(/schemaVersion/);
  });
});

/** A household with the Nov 2026 version and the given `NotificationGroup` rows, which saves write into. */
function fakeSaveDb(stored: StoredNotificationGroup[] = NOTIFICATION_GROUP_ROWS.map((g) => ({ ...g }))) {
  const upserts: unknown[] = [];
  const db: SettingsSaveDb = {
    ...fakeDb([version("2026-11", NOV_2026_CONFIG)]),
    notificationGroup: {
      findMany: async () => stored,
      upsert: async (args) => {
        upserts.push(args);
        const row = stored.find((g) => g.key === args.where.key);
        if (row) Object.assign(row, args.update);
        else stored.push(args.create);
        return {};
      },
    },
  };
  return { db, upserts };
}

describe("getSettings notifications", () => {
  it("shows the seeded switches", async () => {
    const settings = await getSettings(fakeDb([version("2026-11", NOV_2026_CONFIG)]), EMAIL);
    expect(settings.notifications.map((n) => [n.group, n.on])).toEqual([
      ["uploadBill", true],
      ["collectPayments", true],
      ["payBill", true],
      ["fyi", false],
    ]);
  });
});

describe("saveNotificationSwitch", () => {
  it("saves one switch and answers with the Settings screen", async () => {
    const { db, upserts } = fakeSaveDb();
    const settings = await saveNotificationSwitch(db, EMAIL, { group: "fyi", on: true });
    expect(upserts).toEqual([
      { where: { key: "fyi" }, create: { ...NOTIFICATION_GROUP_ROWS[3], enabled: true }, update: { enabled: true } },
    ]);
    expect(settings.notifications.map((n) => n.on)).toEqual([true, true, true, true]);
  });

  it("keeps the other saved switches", async () => {
    const { db } = fakeSaveDb();
    await saveNotificationSwitch(db, EMAIL, { group: "uploadBill", on: false });
    const settings = await saveNotificationSwitch(db, EMAIL, { group: "payBill", on: false });
    expect(settings.notifications.map((n) => n.on)).toEqual([false, true, false, false]);
  });

  it("creates a switch's row when it is missing", async () => {
    const { db } = fakeSaveDb([]);
    const settings = await saveNotificationSwitch(db, EMAIL, { group: "collectPayments", on: false });
    expect(settings.notifications.map((n) => n.on)).toEqual([true, false, true, false]);
  });

  it("is safe to repeat", async () => {
    const { db } = fakeSaveDb();
    await saveNotificationSwitch(db, EMAIL, { group: "payBill", on: false });
    const settings = await saveNotificationSwitch(db, EMAIL, { group: "payBill", on: false });
    expect(settings.notifications.find((n) => n.group === "payBill")?.on).toBe(false);
  });
});
