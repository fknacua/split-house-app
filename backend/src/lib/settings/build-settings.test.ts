import { describe, expect, it } from "vitest";
import { settingsResponseSchema, type HouseholdConfig, type MessageTemplates } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildSettings } from "./build-settings";

const EMAIL = "owner@example.com";

const details = (overrides: MessageTemplates["overrides"], config: HouseholdConfig | null = NOV_2026_CONFIG) =>
  buildSettings({ email: EMAIL, config, templates: { ...DEFAULT_MESSAGE_TEMPLATES, overrides } }).messages.map((m) => m.detail);

describe("buildSettings", () => {
  it("returns the email and the two Messages rows in the board's order", () => {
    const settings = buildSettings({ email: EMAIL, config: NOV_2026_CONFIG, templates: DEFAULT_MESSAGE_TEMPLATES });
    expect(settings.email).toBe(EMAIL);
    expect(settings.messages.map((m) => [m.kind, m.name])).toEqual([
      ["MONTHLY", "Monthly breakdown"],
      ["NUDGE", "Nudge"],
    ]);
    expect(settingsResponseSchema.safeParse(settings).success).toBe(true);
  });

  it("says the same for everyone with no custom version", () => {
    expect(details([])).toEqual(["Same for everyone", "Same for everyone"]);
  });

  it("says the same for everyone before first run", () => {
    expect(details([{ personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi" }], null)).toEqual([
      "Same for everyone",
      "Same for everyone",
    ]);
  });

  it("counts each template's custom versions on its own row", () => {
    expect(
      details([
        { personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi {name}" },
        { personId: PERSON_IDS.sam, kind: "MONTHLY", text: "Hello {name}" },
        { personId: PERSON_IDS.jordan, kind: "NUDGE", text: "Hi {name}, {charge}" },
      ]),
    ).toEqual(["Custom templates: 2", "Custom templates: 1"]);
  });

  it("doesn't count a version for someone who has left", () => {
    expect(details([{ personId: "person-gone", kind: "MONTHLY", text: "Hi" }])).toEqual(["Same for everyone", "Same for everyone"]);
  });
});
