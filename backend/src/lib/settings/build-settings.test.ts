import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_TOGGLES,
  settingsResponseSchema,
  type HouseholdConfig,
  type MessageTemplates,
} from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildNotificationRows, buildSettings } from "./build-settings";

const EMAIL = "owner@example.com";

const details = (overrides: MessageTemplates["overrides"], config: HouseholdConfig | null = NOV_2026_CONFIG) =>
  buildSettings({
    email: EMAIL,
    config,
    templates: { ...DEFAULT_MESSAGE_TEMPLATES, overrides },
    toggles: DEFAULT_NOTIFICATION_TOGGLES,
  }).messages.map((m) => m.detail);

describe("buildSettings", () => {
  it("returns the email, the two Messages rows in the board's order and the notification rows", () => {
    const settings = buildSettings({
      email: EMAIL,
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      toggles: DEFAULT_NOTIFICATION_TOGGLES,
    });
    expect(settings.notifications).toHaveLength(5);
    expect(settings.email).toBe(EMAIL);
    expect(settings.messages.map((m) => [m.kind, m.name])).toEqual([
      ["MONTHLY", "Monthly breakdown"],
      ["NUDGE", "Nudge"],
    ]);
    expect(settingsResponseSchema.safeParse(settings).success).toBe(true);
  });

  it("gives each row its description, and the tone of its status", () => {
    const rows = buildSettings({
      email: EMAIL,
      config: NOV_2026_CONFIG,
      templates: { ...DEFAULT_MESSAGE_TEMPLATES, overrides: [{ personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi" }] },
      toggles: DEFAULT_NOTIFICATION_TOGGLES,
    }).messages;
    expect(rows.map((m) => [m.description, m.tone])).toEqual([
      ["Sent when the month’s charges are ready", "success"],
      ["Sent when a payment is overdue", "muted"],
    ]);
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

describe("buildNotificationRows", () => {
  it("lists the five toggles in the boards' order with their wording", () => {
    expect(buildNotificationRows(DEFAULT_NOTIFICATION_TOGGLES).map((r) => [r.toggle, r.name, r.detail])).toEqual([
      ["uploadBill", "Upload the utilities bill", "Around the 2nd, daily until uploaded"],
      ["collectRent", "Collect rent", "Last working day before the 1st, if unpaid"],
      ["payBill", "Pay the utilities bill", "Before the bill’s due date, with what’s collected"],
      ["paymentChecks", "Payment checks", "On each due date, if still unpaid"],
      ["fyi", "FYI updates", "Unusual bill, aircon servicing due, month settled · silent"],
    ]);
  });

  it("shows each toggle as saved", () => {
    const rows = buildNotificationRows({ ...DEFAULT_NOTIFICATION_TOGGLES, payBill: false, fyi: true });
    expect(rows.map((r) => r.on)).toEqual([true, true, false, true, true]);
  });
});
