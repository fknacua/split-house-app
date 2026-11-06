import type { HouseholdConfig, MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildTemplatePreview, type TemplatePreviewInput } from "./build-template-preview";

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

describe("buildTemplatePreview", () => {
  it("shows every line the engine works out, leaving an unknown placeholder as typed", () => {
    const message = preview({})!;
    expect(message.intro).toEqual([{ text: "Hi Priya! Nov 2026", bold: false }]);
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
      { text: "Total:", bold: true },
      { text: " $1,963.65\nBy 7 Nov\n{oops}", bold: false },
    ]);
  });

  it("shows every line label", () => {
    const templates = withTemplates({ lineLabels: { RENT: "Upa", UTILITIES: "PUB", AIRCON: "AC Servicing" } });
    const message = preview({ templates })!;
    expect(message.sections[0].lines.map((l) => l.label)).toEqual(["Upa", "PUB", "AC Servicing", "Starhub"]);
    expect(message.sections[1].lines.map((l) => l.label)).toEqual(["PUB", "AC Servicing"]);
  });

  it("shows a tenant their own lines", () => {
    const message = preview({ person: JORDAN })!;
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
    expect(preview({ templates, person: JORDAN, text: "Draft" })?.text).toBe("Draft");
  });

  const NUDGE = "Hi {name}! {charge} for {month} ({amount}) due {dueDate}. {oops}";

  it("renders a tenant's nudge about their rent, all intro", () => {
    expect(preview({ kind: "NUDGE", text: NUDGE, person: JORDAN })).toEqual({
      intro: [{ text: "Hi Jordan! Rent for Nov 2026 ($950.00) due 1 Nov. {oops}", bold: false }],
      sections: [],
      outro: [],
      text: "Hi Jordan! Rent for Nov 2026 ($950.00) due 1 Nov. {oops}",
    });
  });

  it("renders the primary tenant's nudge about their own utilities, not a share they collect", () => {
    const message = preview({
      kind: "NUDGE",
      text: "{charge} {amount}",
      templates: withTemplates({ lineLabels: { UTILITIES: "PUB" } }),
    });
    expect(message?.text).toBe("PUB $123.69");
  });

  it("fills only the name and month of a nudge for someone with no charges", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      rooms: NOV_2026_CONFIG.rooms.map((room) =>
        room.id === ROOM_IDS.room3 && room.roomType === "TENANT" ? { ...room, rentCents: 0, airconUnits: 0 } : room,
      ),
      people: NOV_2026_CONFIG.people.map((p) => (p.personId === jordan ? { ...p, utilityShares: 0 } : p)),
    };
    expect(preview({ kind: "NUDGE", text: NUDGE, config, person: JORDAN })?.text).toBe("Hi Jordan! {charge} for Nov 2026 ({amount}) due {dueDate}. {oops}");
  });

  it.each(["", "  \n"])("has nothing to preview for blank text %j", (text) => {
    expect(preview({ text })).toBeNull();
    expect(preview({ kind: "NUDGE", text })).toBeNull();
  });
});
