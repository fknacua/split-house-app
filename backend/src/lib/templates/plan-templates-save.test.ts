import type { MessageTemplates, TemplateSaveRequest } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import {
  applyLabelsSave,
  applyTemplateRemove,
  applyTemplateRestore,
  applyTemplateSave,
  changedTemplates,
} from "./plan-templates-save";

const { jordan, sam } = PERSON_IDS;
const OWN = "Hi {name}, your own.";
const BASE = DEFAULT_MESSAGE_TEMPLATES;

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...BASE, ...templates });

const WITH_OWN = withTemplates({
  overrides: [
    { personId: jordan, kind: "MONTHLY", text: OWN },
    { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
    { personId: sam, kind: "MONTHLY", text: "Sam's" },
  ],
});

describe("applyTemplateSave", () => {
  it.each<[string, MessageTemplates, TemplateSaveRequest, Partial<MessageTemplates>]>([
    ["changes the monthly Default", BASE, { template: "MONTHLY", personId: null, text: "New" }, { monthly: "New" }],
    ["changes the nudge Default", BASE, { template: "NUDGE", personId: null, text: "New" }, { nudge: "New" }],
    [
      "keeps the text as written",
      BASE,
      { template: "MONTHLY", personId: null, text: "  *Hi* {unknown}\n" },
      { monthly: "  *Hi* {unknown}\n" },
    ],
    [
      "adds a custom template",
      BASE,
      { template: "MONTHLY", personId: jordan, text: OWN },
      { overrides: [{ personId: jordan, kind: "MONTHLY", text: OWN }] },
    ],
    [
      "adds one matching the Default, since the user chose to give them one",
      BASE,
      { template: "MONTHLY", personId: jordan, text: BASE.monthly },
      { overrides: [{ personId: jordan, kind: "MONTHLY", text: BASE.monthly }] },
    ],
    [
      "replaces a custom template in place, leaving the other template and people",
      WITH_OWN,
      { template: "MONTHLY", personId: jordan, text: "Changed" },
      {
        overrides: [
          { personId: jordan, kind: "MONTHLY", text: "Changed" },
          { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
          { personId: sam, kind: "MONTHLY", text: "Sam's" },
        ],
      },
    ],
  ])("%s", (_name, templates, save, expected) => {
    expect(applyTemplateSave(templates, save)).toEqual({ ...templates, ...expected });
  });

  it("leaves the labels alone", () => {
    const templates = withTemplates({ lineLabels: { RENT: "Upa" }, sectionTitles: { [sam]: "Room 2" } });
    const next = applyTemplateSave(templates, { template: "MONTHLY", personId: null, text: "New" });
    expect(next.lineLabels).toEqual({ RENT: "Upa" });
    expect(next.sectionTitles).toEqual({ [sam]: "Room 2" });
  });
});

describe("applyTemplateRemove", () => {
  it("removes only that person's template of that kind", () => {
    expect(applyTemplateRemove(WITH_OWN, "MONTHLY", jordan).overrides).toEqual([
      { personId: jordan, kind: "NUDGE", text: "Jordan's nudge" },
      { personId: sam, kind: "MONTHLY", text: "Sam's" },
    ]);
  });

  it("changes nothing for someone without one", () => {
    expect(applyTemplateRemove(WITH_OWN, "NUDGE", sam)).toEqual(WITH_OWN);
  });
});

describe("applyTemplateRestore", () => {
  it.each([
    ["MONTHLY", "monthly"],
    ["NUDGE", "nudge"],
  ] as const)("puts the built-in %s text back, keeping the custom templates", (kind, field) => {
    const edited = { ...WITH_OWN, monthly: "Edited", nudge: "Edited" };
    const next = applyTemplateRestore(edited, kind);
    expect(next[field]).toBe(BASE[field]);
    expect(next[field === "monthly" ? "nudge" : "monthly"]).toBe("Edited");
    expect(next.overrides).toEqual(WITH_OWN.overrides);
  });
});

describe("applyLabelsSave", () => {
  it("sets custom labels and clears one matching the default", () => {
    const templates = withTemplates({ lineLabels: { RENT: "Upa", AIRCON: "AC" } });
    expect(applyLabelsSave(templates, { lineLabels: { RENT: "Rent", UTILITIES: "PUB" } }).lineLabels).toEqual({
      UTILITIES: "PUB",
      AIRCON: "AC",
    });
  });

  it("sets section titles and clears an empty one", () => {
    const templates = withTemplates({ sectionTitles: { [sam]: "Room 2" } });
    const next = applyLabelsSave(templates, { lineLabels: {}, sectionTitles: { [sam]: "", [jordan]: "Room 3 Share" } });
    expect(next.sectionTitles).toEqual({ [jordan]: "Room 3 Share" });
  });

  it("leaves the template text alone", () => {
    const next = applyLabelsSave(WITH_OWN, { lineLabels: { RENT: "Upa" } });
    expect({ ...next, lineLabels: {} }).toEqual({ ...WITH_OWN, lineLabels: {} });
  });
});

describe("changedTemplates", () => {
  it("returns the new wording when it differs", () => {
    expect(changedTemplates(BASE, { ...BASE, monthly: "New" })).toEqual({ ...BASE, monthly: "New" });
  });

  it("returns null when nothing changes", () => {
    expect(changedTemplates(WITH_OWN, applyTemplateSave(WITH_OWN, { template: "MONTHLY", personId: sam, text: "Sam's" }))).toBeNull();
    expect(changedTemplates(BASE, applyTemplateRestore(BASE, "NUDGE"))).toBeNull();
  });

  it("throws when the result breaks the wording schema", () => {
    expect(() => changedTemplates(BASE, { ...BASE, monthly: "" })).toThrow();
  });
});
