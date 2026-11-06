import type { MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildTemplateForm, nudgeSampleIds, templatePersonIds, type TemplateFormInput } from "./build-template-form";

const { alex, priya, sam, jordan } = PERSON_IDS;
const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...DEFAULT_MESSAGE_TEMPLATES, ...templates });

const form = (input: Partial<TemplateFormInput>) =>
  buildTemplateForm({
    kind: "MONTHLY",
    personId: null,
    config: NOV_2026_CONFIG,
    templates: DEFAULT_MESSAGE_TEMPLATES,
    personIds: [priya, sam, jordan],
    people: PEOPLE,
    ...input,
  });

const WITH_JORDAN = withTemplates({ overrides: [{ personId: jordan, kind: "MONTHLY", text: "Jordan's" }] });

describe("buildTemplateForm", () => {
  it("builds the monthly breakdown for Everyone", () => {
    expect(form({})).toEqual({
      kind: "MONTHLY",
      title: "Monthly breakdown",
      sub: "Message template",
      personId: null,
      text: DEFAULT_MESSAGE_TEMPLATES.monthly,
      placeholders: ["{name}", "{month}", "{lines}", "{total}", "{dueDate}"],
      appliesTo: {
        options: [
          { personId: null, label: "Everyone" },
          { personId: priya, label: "Priya" },
          { personId: sam, label: "Sam" },
          { personId: jordan, label: "Jordan" },
        ],
        note: "Everyone without their own version uses this.",
      },
      lineLabels: {
        title: "Line labels",
        note: "How each charge is named in {lines}. Nudges use them too.",
        rows: [
          { type: "RENT", label: "Rent", value: "Rent" },
          { type: "UTILITIES", label: "Utilities bill", value: "Utilities bill" },
          { type: "AIRCON", label: "Aircon servicing", value: "Aircon servicing" },
        ],
      },
      samples: [],
      secondaryAction: { label: "Cancel", kind: "cancel" },
      removeDialog: null,
    });
  });

  it("builds the nudge, with its placeholders, the shared line labels and samples", () => {
    const result = form({ kind: "NUDGE", templates: withTemplates({ lineLabels: { UTILITIES: "PUB" } }) });
    expect(result.title).toBe("Nudge");
    expect(result.text).toBe(DEFAULT_MESSAGE_TEMPLATES.nudge);
    expect(result.placeholders).toEqual(["{name}", "{charge}", "{month}", "{amount}", "{dueDate}"]);
    expect(result.appliesTo.note).toBe("Everyone gets this nudge. Pick someone to give them their own version.");
    expect(result.lineLabels).toEqual({
      title: "Line labels",
      note: "How each charge is named in {charge}. The monthly breakdown uses them too.",
      rows: [
        { type: "RENT", label: "Rent", value: "Rent" },
        { type: "UTILITIES", label: "Utilities bill", value: "PUB" },
        { type: "AIRCON", label: "Aircon servicing", value: "Aircon servicing" },
      ],
    });
    expect(result.samples).toEqual([
      { personId: jordan, label: "Jordan" },
      { personId: priya, label: "Priya" },
    ]);
  });

  it("changes the nudge's note once someone has their own version", () => {
    const templates = withTemplates({ overrides: [{ personId: sam, kind: "NUDGE", text: "Sam's" }] });
    expect(form({ kind: "NUDGE", templates }).appliesTo.note).toBe("Everyone without their own version uses this.");
  });

  it("loads a person's own version, with the remove action and dialog", () => {
    const result = form({ personId: jordan, templates: WITH_JORDAN });
    expect(result.personId).toBe(jordan);
    expect(result.text).toBe("Jordan's");
    expect(result.appliesTo.note).toBe("Only Jordan gets this version. Removing it puts them back on Everyone’s.");
    expect(result.secondaryAction).toEqual({ label: "Remove this version", kind: "remove-version" });
    expect(result.removeDialog).toEqual({
      title: "Remove this version?",
      body: "Jordan goes back to the Everyone template. Messages already sent won’t change.",
    });
  });

  it("starts someone with no version of their own from Everyone's, with Cancel", () => {
    const result = form({ personId: sam, templates: WITH_JORDAN });
    expect(result.text).toBe(DEFAULT_MESSAGE_TEMPLATES.monthly);
    expect(result.appliesTo.note).toBe("Sam uses Everyone’s version. Saving a change gives them their own.");
    expect(result.secondaryAction.kind).toBe("cancel");
    expect(result.removeDialog).toBeNull();
  });

  it("has no samples with a person loaded", () => {
    expect(form({ kind: "NUDGE", personId: jordan }).samples).toEqual([]);
  });

  it("reads a custom line label into its field", () => {
    const { rows } = form({ templates: withTemplates({ lineLabels: { UTILITIES: "PUB" } }) }).lineLabels;
    expect(rows[1]).toEqual({ type: "UTILITIES", label: "Utilities bill", value: "PUB" });
  });
});

describe("templatePersonIds", () => {
  const without = (personId: string) => ({ ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== personId) });

  it("leaves out the owner", () => {
    expect(templatePersonIds([NOV_2026_CONFIG])).toEqual([priya, sam, jordan]);
  });

  it("keeps someone in either version, once", () => {
    expect(templatePersonIds([without(sam), without(jordan)])).toEqual([priya, jordan, sam]);
  });
});

describe("nudgeSampleIds", () => {
  it("is a tenant then the primary tenant", () => {
    expect(nudgeSampleIds(NOV_2026_CONFIG)).toEqual([jordan, priya]);
  });

  it("leaves out who the household doesn't have", () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.role !== "TENANT") };
    expect(nudgeSampleIds(config)).toEqual([priya]);
  });
});
