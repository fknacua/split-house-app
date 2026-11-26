import { describe, expect, it } from "vitest";
import {
  settingsResponseSchema,
  type HouseholdConfig,
  type MessageTemplates,
} from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { NOTIFICATION_GROUP_ROWS } from "@/lib/notifications/rows";
import { buildNotificationRows, buildSettings } from "./build-settings";

const EMAIL = "owner@example.com";

const details = (overrides: MessageTemplates["overrides"], config: HouseholdConfig | null = NOV_2026_CONFIG) =>
  buildSettings({
    email: EMAIL,
    config,
    templates: { ...DEFAULT_MESSAGE_TEMPLATES, overrides },
    groups: NOTIFICATION_GROUP_ROWS,
  }).messages.map((m) => m.detail);

describe("buildSettings", () => {
  it("returns the email, the two Messages rows in the board's order and the notification rows", () => {
    const settings = buildSettings({
      email: EMAIL,
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      groups: NOTIFICATION_GROUP_ROWS,
    });
    expect(settings.notifications).toHaveLength(4);
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
      groups: NOTIFICATION_GROUP_ROWS,
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
  it("lists the switches in the order given, with their label and helper line", () => {
    expect(buildNotificationRows(NOTIFICATION_GROUP_ROWS).map((r) => [r.group, r.name, r.detail, r.on])).toEqual([
      ["uploadBill", "Upload utilities bill", "8:00 from the 1st until uploaded", true],
      ["collectPayments", "Collect tenant payments", "8:00 from the day before each due date until paid", true],
      ["payBill", "Pay utilities bill", "8:00 from the day before the due date until paid", true],
      ["fyi", "FYI updates", "Unusual bill, aircon servicing due, month settled · silent", false],
    ]);
  });

  it("shows each switch as saved, with the stored wording", () => {
    const rows = buildNotificationRows([
      { ...NOTIFICATION_GROUP_ROWS[2], enabled: false },
      { ...NOTIFICATION_GROUP_ROWS[3], label: "Updates", enabled: true },
    ]);
    expect(rows.map((r) => [r.group, r.name, r.on])).toEqual([
      ["payBill", "Pay utilities bill", false],
      ["fyi", "Updates", true],
    ]);
  });
});
