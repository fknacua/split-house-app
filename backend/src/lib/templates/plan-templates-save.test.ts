import type { MessageTemplates, TemplateSaveRequest } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { applyTemplatesSave, planTemplatesSave } from "./plan-templates-save";

const { jordan, sam } = PERSON_IDS;
const OWN = "Hi {name}, your own.";
const BASE = DEFAULT_MESSAGE_TEMPLATES;

const save = (fields: Partial<TemplateSaveRequest>): TemplateSaveRequest => ({
  template: "MONTHLY",
  personId: null,
  text: BASE.monthly,
  ...fields,
});

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...BASE, ...templates });

const WITH_OWN = withTemplates({
  overrides: [
    { personId: jordan, kind: "MONTHLY", text: OWN },
    { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
    { personId: sam, kind: "MONTHLY", text: "Sam's" },
  ],
});

describe("applyTemplatesSave", () => {
  it.each<[string, MessageTemplates, Partial<TemplateSaveRequest>, Partial<MessageTemplates>]>([
    ["changes Everyone's monthly", BASE, { text: "New" }, { monthly: "New" }],
    ["changes Everyone's nudge", BASE, { template: "NUDGE", text: "New" }, { nudge: "New" }],
    ["sends text as written", BASE, { text: "  *Hi* {unknown}\n" }, { monthly: "  *Hi* {unknown}\n" }],
    [
      "adds a person's own version when it differs",
      BASE,
      { personId: jordan, text: OWN },
      { overrides: [{ personId: jordan, kind: "MONTHLY", text: OWN }] },
    ],
    ["adds none when it matches Everyone's", BASE, { personId: jordan }, { overrides: [] }],
    [
      "replaces a person's own version in place, leaving their other kind and other people",
      WITH_OWN,
      { personId: jordan, text: "Changed" },
      {
        overrides: [
          { personId: jordan, kind: "MONTHLY", text: "Changed" },
          { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
          { personId: sam, kind: "MONTHLY", text: "Sam's" },
        ],
      },
    ],
    [
      "removes only that kind of that person's version",
      WITH_OWN,
      { personId: jordan, text: null },
      {
        overrides: [
          { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
          { personId: sam, kind: "MONTHLY", text: "Sam's" },
        ],
      },
    ],
    ["sets a custom line label, trimmed", BASE, { lineLabels: { UTILITIES: " PUB " } }, { lineLabels: { UTILITIES: "PUB" } }],
    [
      "clears a custom label set back to the default",
      withTemplates({ lineLabels: { UTILITIES: "PUB", RENT: "Upa" } }),
      { lineLabels: { UTILITIES: "Utilities bill" } },
      { lineLabels: { RENT: "Upa" } },
    ],
    [
      "keeps a saved label when the field is cleared, which the plan refuses",
      withTemplates({ lineLabels: { RENT: "Upa" } }),
      { lineLabels: { RENT: "  " } },
      { lineLabels: { RENT: "Upa" } },
    ],
  ])("%s", (_name, templates, fields, expected) => {
    expect(applyTemplatesSave(templates, save(fields))).toEqual({ ...templates, ...expected });
  });

  it("leaves the wording passed alone", () => {
    const before = structuredClone(WITH_OWN);
    applyTemplatesSave(WITH_OWN, save({ text: "New", lineLabels: { RENT: "Upa" } }));
    expect(WITH_OWN).toEqual(before);
  });
});

describe("planTemplatesSave", () => {
  it("saves a change", () => {
    const result = planTemplatesSave(BASE, save({ text: "New" }));
    expect(result).toMatchObject({ canSave: true, errors: {} });
    expect(result.next?.monthly).toBe("New");
  });

  it("has nothing to save when nothing changes", () => {
    expect(planTemplatesSave(BASE, save({}))).toEqual({ next: null, errors: {}, canSave: false });
    expect(planTemplatesSave(BASE, save({ personId: jordan }))).toMatchObject({ canSave: false, errors: {} });
    expect(planTemplatesSave(BASE, save({ personId: jordan, text: null }))).toMatchObject({ canSave: false, errors: {} });
  });

  it("removes a person's own version", () => {
    const result = planTemplatesSave(WITH_OWN, save({ personId: sam, text: null }));
    expect(result.canSave).toBe(true);
    expect(result.next?.overrides).toHaveLength(2);
  });

  it("accepts an unknown placeholder, which stays as typed", () => {
    expect(planTemplatesSave(BASE, save({ text: "Hi {nmae}" })).canSave).toBe(true);
  });

  it.each<[string, Partial<TemplateSaveRequest>, Record<string, string>]>([
    ["empty text", { text: "" }, { text: "Write a message." }],
    ["blank text", { text: " \n " }, { text: "Write a message." }],
    ["removing Everyone's", { text: null }, { text: "Write a message." }],
    ["an empty line label", { text: "New", lineLabels: { AIRCON: " " } }, { "lineLabels.AIRCON": "Enter a label." }],
  ])("refuses %s", (_name, fields, errors) => {
    expect(planTemplatesSave(BASE, save(fields))).toEqual({ next: null, errors, canSave: false });
  });
});
