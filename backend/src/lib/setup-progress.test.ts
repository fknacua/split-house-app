import { describe, expect, it } from "vitest";
import type { HouseholdConfig } from "@splithouse/shared";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { deriveSetupProgress } from "./setup-progress";

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

