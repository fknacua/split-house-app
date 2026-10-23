import { describe, expect, it } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@/lib/household/config";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { currentMonth } from "@/lib/month";
import { DEFAULT_NOTIFICATIONS, parseNotificationSettings } from "@/lib/settings";
import { deriveSetupProgress } from "@/lib/setup-progress";
import { getBootstrap, type BootstrapDb } from "./bootstrap";

function fakeDb(opts: {
  version?: { schemaVersion: number; config: unknown } | null;
  notifications?: unknown;
}): BootstrapDb {
  return {
    householdVersion: { findFirst: async () => opts.version ?? null },
    settings: {
      findUnique: async () =>
        opts.notifications === undefined ? null : { notifications: opts.notifications },
    },
  };
}

const stepDone = (config: HouseholdConfig | null) =>
  Object.fromEntries(deriveSetupProgress(config).map((s) => [s.id, s.done]));

describe("deriveSetupProgress", () => {
  it("lists the five steps in the Welcome order, with Messages and Reminders optional", () => {
    const steps = deriveSetupProgress(null);
    expect(steps.map((s) => s.id)).toEqual([
      "rentAndRooms",
      "people",
      "yourSplit",
      "messages",
      "reminders",
    ]);
    expect(steps.map((s) => s.optional)).toEqual([false, false, false, true, true]);
  });

  it("has nothing done before a household exists", () => {
    expect(Object.values(stepDone(null))).toEqual([false, false, false, false, false]);
  });

  it("marks the three required steps done for the Nov 2026 household, the optional ones not", () => {
    expect(stepDone(NOV_2026_CONFIG)).toEqual({
      rentAndRooms: true,
      people: true,
      yourSplit: true,
      messages: false,
      reminders: false,
    });
  });

  it("leaves People and Your split open when there is only the owner", () => {
    const ownerOnly: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.role === "OWNER"),
      recurring: [],
      templates: { ...NOV_2026_CONFIG.templates, overrides: [] },
      categories: {
        rent: { ...NOV_2026_CONFIG.categories.rent, ownerBps: 10000, primaryBps: 0 },
        utilities: { ...NOV_2026_CONFIG.categories.utilities, ownerBps: 10000, primaryBps: 0 },
        aircon: { ...NOV_2026_CONFIG.categories.aircon, ownerBps: 10000, primaryBps: 0 },
      },
    };
    const done = stepDone(ownerOnly);
    expect(done.people).toBe(false);
    expect(done.yourSplit).toBe(false);
  });
});

describe("parseNotificationSettings", () => {
  it("uses the design defaults when there is no row", () => {
    expect(parseNotificationSettings(undefined)).toEqual(DEFAULT_NOTIFICATIONS);
    expect(DEFAULT_NOTIFICATIONS).toEqual({
      upload: true,
      tenant1: true,
      savings: true,
      paysp: true,
      checks: true,
      fyi: false,
    });
  });

  it("keeps stored toggles and fills in the missing ones", () => {
    expect(parseNotificationSettings({ upload: false, fyi: true })).toEqual({
      ...DEFAULT_NOTIFICATIONS,
      upload: false,
      fyi: true,
    });
  });

  it("falls back to the defaults for a value it cannot read", () => {
    expect(parseNotificationSettings({ upload: "yes" })).toEqual(DEFAULT_NOTIFICATIONS);
    expect(parseNotificationSettings("nope")).toEqual(DEFAULT_NOTIFICATIONS);
  });
});

describe("getBootstrap", () => {
  it("says there is no household before first run, with the default settings", async () => {
    const result = await getBootstrap(fakeDb({}));
    expect(result.hasHousehold).toBe(false);
    expect(result.currentMonth).toBe(currentMonth());
    expect(result.setupProgress.every((s) => !s.done)).toBe(true);
    expect(result.settings.notifications).toEqual(DEFAULT_NOTIFICATIONS);
  });

  it("reports a household, its progress and the stored toggles", async () => {
    const result = await getBootstrap(
      fakeDb({
        version: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
        notifications: { checks: false },
      }),
    );
    expect(result.hasHousehold).toBe(true);
    expect(result.setupProgress.filter((s) => s.done).map((s) => s.id)).toEqual([
      "rentAndRooms",
      "people",
      "yourSplit",
    ]);
    expect(result.settings.notifications).toEqual({ ...DEFAULT_NOTIFICATIONS, checks: false });
  });

  it("throws for a version with an unknown schemaVersion instead of misreading it", async () => {
    await expect(
      getBootstrap(fakeDb({ version: { schemaVersion: 999, config: NOV_2026_CONFIG } })),
    ).rejects.toThrow(/schemaVersion/);
  });
});
