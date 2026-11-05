import type { HouseholdConfig, MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildTemplatePreview, previewPersonId, type TemplatePreviewInput } from "./build-template-preview";

const { alex, priya, sam, jordan } = PERSON_IDS;
const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];
const PRIYA = { id: priya, name: "Priya" };
const JORDAN = { id: jordan, name: "Jordan" };

const preview = (input: Partial<TemplatePreviewInput>) =>
  buildTemplatePreview({
    kind: "MONTHLY",
    text: "Hi {name}! {month}\n\n{lines}\n\n*Total:* {total}\nBy {dueDate}\n{oops}",
    month: "2026-11",
    config: NOV_2026_CONFIG,
    templates: DEFAULT_MESSAGE_TEMPLATES,
    person: PRIYA,
    people: PEOPLE,
    ...input,
  });

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...DEFAULT_MESSAGE_TEMPLATES, ...templates });

describe("previewPersonId", () => {
  it.each<[string, Parameters<typeof previewPersonId>[1], string]>([
    ["the person chosen", { kind: "MONTHLY", personId: sam }, sam],
    ["the person chosen over a sample", { kind: "NUDGE", personId: sam, samplePersonId: priya }, sam],
    ["the primary tenant on the monthly breakdown", { kind: "MONTHLY", personId: null }, priya],
    ["the first sample on the nudge", { kind: "NUDGE", personId: null }, jordan],
    ["the sample asked for", { kind: "NUDGE", personId: null, samplePersonId: priya }, priya],
    ["the first sample for an unknown one", { kind: "NUDGE", personId: null, samplePersonId: alex }, jordan],
  ])("picks %s", (_name, input, expected) => {
    expect(previewPersonId(NOV_2026_CONFIG, input)).toBe(expected);
  });

  it("falls back to a tenant with no primary tenant, and the owner with nobody else", () => {
    const noPrimary = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.role !== "PRIMARY") };
    expect(previewPersonId(noPrimary, { kind: "MONTHLY", personId: null })).toBe(jordan);
    const ownerOnly = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.role === "OWNER") };
    expect(previewPersonId(ownerOnly, { kind: "NUDGE", personId: null })).toBe(alex);
  });
});

describe("buildTemplatePreview", () => {
  it("shows every line the engine works out, leaving an unknown placeholder as typed", () => {
    const { meta, preview: message } = preview({});
    expect(meta).toBe("Priya · Nov 2026 sample");
    expect(message.intro).toBe("Hi Priya! Nov 2026");
    expect(message.sections).toEqual([
      {
        title: "Yours:",
        lines: [
          { label: "Rent", amount: "$1,675.00", working: null },
          { label: "Utilities bill", amount: "$123.69", working: "(total bill $412.30)" },
          { label: "Aircon servicing", amount: "$36.67", working: "(2/6 units)" },
          { label: "Starhub", amount: "$27.50", working: null },
        ],
        subtotal: "$1,862.86",
      },
      {
        title: "Sam’s (please collect):",
        lines: [
          { label: "Utilities bill", amount: "$82.46", working: "(total bill $412.30)" },
          { label: "Aircon servicing", amount: "$18.33", working: "(1/6 units)" },
        ],
        subtotal: "$100.79",
      },
    ]);
    expect(message.outro).toEqual([
      { text: "*Total:* $1,963.65", isTotal: true },
      { text: "By 7 Nov", isTotal: false },
      { text: "{oops}", isTotal: false },
    ]);
  });

  it("shows every line label", () => {
    const templates = withTemplates({ lineLabels: { RENT: "Upa", UTILITIES: "PUB", AIRCON: "AC Servicing" } });
    const { preview: message } = preview({ templates });
    expect(message.sections[0].lines.map((l) => l.label)).toEqual(["Upa", "PUB", "AC Servicing", "Starhub"]);
    expect(message.sections[1].lines.map((l) => l.label)).toEqual(["PUB", "AC Servicing"]);
  });

  it("shows a tenant their own lines", () => {
    const { meta, preview: message } = preview({ person: JORDAN });
    expect(meta).toBe("Jordan · Nov 2026 sample");
    expect(message.sections).toEqual([
      {
        title: null,
        lines: [
          { label: "Rent", amount: "$950.00", working: null },
          { label: "Utilities bill", amount: "$82.46", working: "(total bill $412.30)" },
          { label: "Aircon servicing", amount: "$18.33", working: "(1/6 units)" },
        ],
        subtotal: null,
      },
    ]);
  });

  it("shows the draft over the person's saved version", () => {
    const templates = withTemplates({ overrides: [{ personId: jordan, kind: "MONTHLY", text: "Saved" }] });
    expect(preview({ templates, person: JORDAN, text: "Draft" }).preview.text).toBe("Draft");
  });

  const NUDGE = "Hi {name}! {charge} for {month} ({amount}) due {dueDate}. {oops}";

  it("renders a tenant's nudge about their rent, all intro", () => {
    const { meta, preview: message } = preview({ kind: "NUDGE", text: NUDGE, person: JORDAN });
    expect(meta).toBe("Jordan · Rent · Nov 2026 sample");
    expect(message).toEqual({
      intro: "Hi Jordan! Rent for Nov 2026 ($950.00) due 1 Nov. {oops}",
      sections: [],
      outro: [],
      text: "Hi Jordan! Rent for Nov 2026 ($950.00) due 1 Nov. {oops}",
    });
  });

  it("renders the primary tenant's nudge about their own utilities, not a share they collect", () => {
    const { meta, preview: message } = preview({
      kind: "NUDGE",
      text: "{charge} {amount}",
      templates: withTemplates({ lineLabels: { UTILITIES: "PUB" } }),
    });
    expect(meta).toBe("Priya · PUB · Nov 2026 sample");
    expect(message.text).toBe("PUB $123.69");
  });

  it("fills only the name and month of a nudge for someone with no charges", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) =>
        room.id === ROOM_IDS.room3 && room.roomType === "TENANT" ? { ...room, rentCents: 0, airconUnits: 0 } : room,
      ),
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === jordan ? { ...p, utilityShares: 0 } : p)),
    };
    const { meta, preview: message } = preview({ kind: "NUDGE", text: NUDGE, config, person: JORDAN });
    expect(meta).toBe("Jordan · Nov 2026 sample");
    expect(message.text).toBe("Hi Jordan! {charge} for Nov 2026 ({amount}) due {dueDate}. {oops}");
  });
});
