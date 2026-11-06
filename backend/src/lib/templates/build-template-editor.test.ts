import type { MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildTemplateEditor, type TemplateEditorInput } from "./build-template-editor";
import { templatePeople } from "./template-people";

const { alex, priya, sam, jordan } = PERSON_IDS;
const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...DEFAULT_MESSAGE_TEMPLATES, ...templates });

const editor = (input: Partial<TemplateEditorInput>) =>
  buildTemplateEditor({
    kind: "MONTHLY",
    personId: null,
    templates: DEFAULT_MESSAGE_TEMPLATES,
    templatePeople: templatePeople([NOV_2026_CONFIG], PEOPLE),
    ...input,
  });

const WITH_JORDAN = withTemplates({ overrides: [{ personId: jordan, kind: "MONTHLY", text: "Jordan's" }] });

describe("buildTemplateEditor", () => {
  it("builds the monthly Default with the built-in text", () => {
    expect(editor({})).toEqual({
      kind: "MONTHLY",
      personId: null,
      title: "Default",
      sub: "Monthly breakdown",
      text: DEFAULT_MESSAGE_TEMPLATES.monthly,
      limit: 1000,
      placeholders: ["{name}", "{month}", "{lines}", "{total}", "{dueDate}"],
      restore: null,
      secondaryAction: { label: "Cancel", kind: "cancel" },
      removeDialog: null,
      labels: {
        title: "Line labels",
        hint: "How each charge is named in {lines}.",
        sharedNote: "Shared with Nudge templates",
        rows: [
          { type: "RENT", label: "Rent", value: "Rent" },
          { type: "UTILITIES", label: "Utilities bill", value: "Utilities bill" },
          { type: "AIRCON", label: "Aircon servicing", value: "Aircon servicing" },
        ],
        sectionTitles: {
          title: "Section titles",
          rows: [
            { personId: priya, label: "Priya", value: "" },
            { personId: sam, label: "Sam", value: "" },
            { personId: jordan, label: "Jordan", value: "" },
          ],
        },
      },
    });
  });

  it("offers Restore once the Default differs from the built-in text", () => {
    expect(editor({ templates: withTemplates({ monthly: "Edited" }) }).restore).toEqual({
      label: "Restore to original",
      dialog: {
        title: "Restore original template?",
        body: "Your edited Default template for Monthly breakdown will be replaced with the original. Messages already sent won’t change.",
        confirmLabel: "Restore original",
        cancelLabel: "Cancel",
      },
    });
    expect(editor({ kind: "NUDGE", templates: withTemplates({ nudge: "Edited" }) }).restore?.dialog.body).toContain(
      "Default template for Nudge",
    );
  });

  it("builds the nudge Default with its chips, limit and labels, and no section titles", () => {
    const body = editor({ kind: "NUDGE" });
    expect(body).toMatchObject({
      sub: "Nudge",
      text: DEFAULT_MESSAGE_TEMPLATES.nudge,
      limit: 500,
      placeholders: ["{name}", "{charge}", "{month}", "{amount}", "{dueDate}"],
      labels: {
        hint: "How each charge is named in {charge}.",
        sharedNote: "Shared with Monthly breakdown templates",
        sectionTitles: null,
      },
    });
  });

  it("opens a saved custom template with Remove, and no Restore", () => {
    const body = editor({ personId: jordan, templates: withTemplates({ ...WITH_JORDAN, monthly: "Edited" }) });
    expect(body).toMatchObject({
      personId: jordan,
      title: "Custom template for Jordan",
      text: "Jordan's",
      restore: null,
      secondaryAction: { label: "Remove this template", kind: "remove" },
      removeDialog: {
        title: "Remove this template?",
        body: "Jordan will get the Default template. Messages already sent won’t change.",
        confirmLabel: "Remove template",
        cancelLabel: "Cancel",
      },
    });
  });

  it("starts a new custom template from the Default's text", () => {
    const body = editor({ personId: sam, templates: withTemplates({ ...WITH_JORDAN, monthly: "Edited" }) });
    expect(body).toMatchObject({
      title: "Custom template for Sam",
      text: "Edited",
      secondaryAction: { label: "Cancel", kind: "cancel" },
      removeDialog: null,
    });
  });

  it("reads the saved labels and section titles", () => {
    const templates = withTemplates({ lineLabels: { UTILITIES: "PUB" }, sectionTitles: { [priya]: "Master Bedroom Share" } });
    const { labels } = editor({ templates });
    expect(labels.rows[1].value).toBe("PUB");
    expect(labels.sectionTitles?.rows[0]).toEqual({ personId: priya, label: "Priya", value: "Master Bedroom Share" });
  });
});
