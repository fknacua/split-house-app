import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_SCHEMA_VERSION, type HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { getSettings, type SettingsDb } from "./settings.service";

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
