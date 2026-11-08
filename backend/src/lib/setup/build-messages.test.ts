import { describe, expect, it } from "vitest";
import { setupMessagesResponseSchema, type MessageTemplates } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildMessagesPage, discardCustomTemplates, hasCustomTemplate } from "./build-messages";

const withOverrides = (overrides: MessageTemplates["overrides"]): MessageTemplates => ({ ...DEFAULT_MESSAGE_TEMPLATES, overrides });

describe("buildMessagesPage", () => {
  it("shows the two rows the same for everyone, Save disabled and no dialog with no custom template", () => {
    const page = buildMessagesPage(NOV_2026_CONFIG, DEFAULT_MESSAGE_TEMPLATES);
    expect(setupMessagesResponseSchema.safeParse(page).success).toBe(true);
    expect(page).toMatchObject({ title: "Custom messages", sub: "Optional", note: "You can change these any time in Settings." });
    expect(page.rows).toEqual([
      { kind: "MONTHLY", name: "Monthly breakdown", description: "Sent when the month’s charges are ready", detail: "Same for everyone", tone: "muted" },
      { kind: "NUDGE", name: "Nudge", description: "Sent when a payment is overdue", detail: "Same for everyone", tone: "muted" },
    ]);
    expect(page.save).toEqual({ label: "Save", enabled: false });
    expect(page.skip).toEqual({ label: "Not now", confirm: null });
  });

  it("enables Save and asks before discarding once someone has a custom template", () => {
    const page = buildMessagesPage(NOV_2026_CONFIG, withOverrides([{ personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi {name}" }]));
    expect(page.rows.map((r) => [r.detail, r.tone])).toEqual([
      ["Custom templates: 1", "success"],
      ["Same for everyone", "muted"],
    ]);
    expect(page.save.enabled).toBe(true);
    expect(page.skip.confirm).toEqual({
      title: "Skip custom messages?",
      body: "Your custom templates will be discarded. You can set up custom templates again in Settings.",
      confirmLabel: "Discard templates",
      cancelLabel: "Keep templates",
    });
  });

  it("counts a custom Nudge alone", () => {
    const page = buildMessagesPage(NOV_2026_CONFIG, withOverrides([{ personId: PERSON_IDS.sam, kind: "NUDGE", text: "Hi {name}, {charge}" }]));
    expect(page.rows.map((r) => r.detail)).toEqual(["Same for everyone", "Custom templates: 1"]);
    expect(page.save.enabled).toBe(true);
  });
});

describe("hasCustomTemplate", () => {
  it("doesn't count a custom template for someone not in the household", () => {
    expect(hasCustomTemplate(NOV_2026_CONFIG, withOverrides([{ personId: "person-gone", kind: "MONTHLY", text: "Hi" }]))).toBe(false);
  });
});

describe("discardCustomTemplates", () => {
  it("removes every custom template and section title, keeping the Defaults and line labels", () => {
    const templates: MessageTemplates = {
      monthly: "Hi {name}, {lines}",
      nudge: "Hi {name}, {charge}",
      overrides: [
        { personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hello {name}" },
        { personId: PERSON_IDS.sam, kind: "NUDGE", text: "Hey {name}" },
      ],
      lineLabels: { UTILITIES: "Power and water" },
      sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.priya]: "Room share" } },
    };
    expect(discardCustomTemplates(templates)).toEqual({
      monthly: "Hi {name}, {lines}",
      nudge: "Hi {name}, {charge}",
      overrides: [],
      lineLabels: { UTILITIES: "Power and water" },
      sectionTitles: {},
    });
  });
});
