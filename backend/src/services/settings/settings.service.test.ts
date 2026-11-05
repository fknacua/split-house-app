import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { getSettings, type SettingsDb } from "./settings.service";

const EMAIL = "owner@example.com";

const version = (startsFromMonth: string, config: HouseholdConfig) => ({
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

const WITH_OVERRIDE: HouseholdConfig = {
  ...NOV_2026_CONFIG,
  templates: {
    ...NOV_2026_CONFIG.templates,
    overrides: [{ personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi {name}" }],
  },
};

/** A household with the given versions, newest first as the service asks for them. */
function fakeDb(versions: ReturnType<typeof version>[]): SettingsDb {
  return {
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: { findMany: async () => versions },
  };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getSettings", () => {
  it("counts a custom version saved for next month", async () => {
    const settings = await getSettings(
      fakeDb([version("2026-12", WITH_OVERRIDE), version("2026-11", NOV_2026_CONFIG)]),
      EMAIL,
    );
    expect(settings.email).toBe(EMAIL);
    expect(settings.messages[0].detail).toBe("Custom versions: 1");
  });

  it("leaves out a version starting after next month", async () => {
    const settings = await getSettings(
      fakeDb([version("2027-01", WITH_OVERRIDE), version("2026-11", NOV_2026_CONFIG)]),
      EMAIL,
    );
    expect(settings.messages[0].detail).toBe("Same for everyone");
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
