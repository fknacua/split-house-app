import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NOTIFICATION_TOGGLES, HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { getSettings, saveNotificationToggle, type SettingsDb, type SettingsSaveDb } from "./settings.service";

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
    settings: { findUnique: async () => null },
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

/** A household with the Nov 2026 version and a `Settings` row that holds `stored`, or none while it is null. */
function fakeSaveDb(stored: unknown) {
  const row = { notifications: stored };
  const upserts: unknown[] = [];
  const db: SettingsSaveDb = {
    ...fakeDb([version("2026-11", NOV_2026_CONFIG)]),
    settings: {
      findUnique: async () => (row.notifications === null ? null : row),
      upsert: async (args) => {
        upserts.push(args);
        row.notifications = row.notifications === null ? args.create.notifications : args.update.notifications;
        return row;
      },
    },
  };
  return { db, upserts };
}

describe("getSettings notifications", () => {
  it("shows the defaults with no row yet", async () => {
    const settings = await getSettings(fakeDb([version("2026-11", NOV_2026_CONFIG)]), EMAIL);
    expect(settings.notifications.map((n) => [n.toggle, n.on])).toEqual(
      Object.entries(DEFAULT_NOTIFICATION_TOGGLES),
    );
  });
});

describe("saveNotificationToggle", () => {
  it("creates the row on the first save, with the defaults and the one toggle changed", async () => {
    const { db, upserts } = fakeSaveDb(null);
    const settings = await saveNotificationToggle(db, EMAIL, { toggle: "fyi", on: true });
    expect(upserts).toEqual([
      {
        where: { id: "singleton" },
        create: { id: "singleton", notifications: { ...DEFAULT_NOTIFICATION_TOGGLES, fyi: true } },
        update: { notifications: { ...DEFAULT_NOTIFICATION_TOGGLES, fyi: true } },
      },
    ]);
    expect(settings.notifications.find((n) => n.toggle === "fyi")?.on).toBe(true);
  });

  it("keeps the other saved toggles and drops keys the reader doesn't know", async () => {
    const { db } = fakeSaveDb({ ...DEFAULT_NOTIFICATION_TOGGLES, uploadBill: false, savings: true });
    const settings = await saveNotificationToggle(db, EMAIL, { toggle: "collectRent", on: false });
    expect(settings.notifications.map((n) => n.on)).toEqual([false, false, true, true, false]);
  });

  it("is safe to repeat", async () => {
    const { db } = fakeSaveDb(null);
    await saveNotificationToggle(db, EMAIL, { toggle: "payBill", on: false });
    const settings = await saveNotificationToggle(db, EMAIL, { toggle: "payBill", on: false });
    expect(settings.notifications.find((n) => n.toggle === "payBill")?.on).toBe(false);
  });
});
