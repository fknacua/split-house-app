import { LINE_LABEL_TYPES, type HouseholdConfig, type MessageTemplates, type TemplateEditorResponse, type TemplateKind } from "@splithouse/shared";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { DEFAULT_LINE_LABELS } from "@/lib/messages/line-label";
import { buildSectionLabels } from "./build-section-labels";
import type { TemplatePerson } from "./template-people";
import { customText, defaultText, TEMPLATE_NAMES } from "./template-text";

const PLACEHOLDER_CHIPS: Record<TemplateKind, string[]> = {
  MONTHLY: ["{name}", "{month}", "{lines}", "{total}", "{dueDate}"],
  NUDGE: ["{name}", "{charge}", "{month}", "{amount}", "{dueDate}"],
};

/** The Line labels sheet's hint and the note on what else uses the labels, per template. */
const LABELS_COPY: Record<TemplateKind, { hint: string; sharedNote: string }> = {
  MONTHLY: { hint: "How each charge is named in {lines}.", sharedNote: "Shared with Nudge templates" },
  NUDGE: { hint: "How each charge is named in {charge}.", sharedNote: "Shared with Monthly breakdown templates" },
};

/** What `buildTemplateEditor` reads. */
export interface TemplateEditorInput {
  kind: TemplateKind;
  /** The person whose custom template this is, one of `templatePeople`, or null for the Default. */
  personId: string | null;
  /** The current wording. */
  templates: MessageTemplates;
  /** Who can have a custom template, from `templatePeople`. */
  templatePeople: TemplatePerson[];
  /** The active month, which the Section labels' sample lines are dated with. */
  month: string;
  /** Next month's config, then the active month's when there is one, for the Section labels. */
  configs: HouseholdConfig[];
  /** Everyone's names, for the Section labels. */
  people: { id: string; name: string }[];
}

/** The Line labels sheet: the household's labels. */
function labelsSheet(input: TemplateEditorInput): TemplateEditorResponse["labels"] {
  const { kind, templates } = input;
  return {
    title: "Line labels",
    ...LABELS_COPY[kind],
    rows: LINE_LABEL_TYPES.map((type) => ({
      type,
      label: DEFAULT_LINE_LABELS[type],
      value: templates.lineLabels[type] ?? DEFAULT_LINE_LABELS[type],
    })),
  };
}

/**
 * The template editor, display-ready, for the Default, a person's saved custom template, or a new one, which starts
 * from the Default's text. Restore shows on the Default only once it differs from the built-in text.
 *
 * @param input - The template, the person, the wording and who can have a custom template.
 * @returns The response for `GET /api/templates/:kind/editor`.
 */
export function buildTemplateEditor(input: TemplateEditorInput): TemplateEditorResponse {
  const { kind, personId, templates } = input;
  const person = input.templatePeople.find((p) => p.personId === personId);
  const name = person?.name ?? "Someone";
  const own = personId ? customText(templates, kind, personId) : undefined;
  const text = own ?? defaultText(templates, kind);
  const isEdited = personId === null && text !== defaultText(DEFAULT_MESSAGE_TEMPLATES, kind);

  return {
    kind,
    personId,
    title: personId ? `Custom template for ${name}` : "Default",
    sub: TEMPLATE_NAMES[kind],
    text,
    placeholders: PLACEHOLDER_CHIPS[kind],
    restore: isEdited
      ? {
          label: "Restore to original",
          dialog: {
            title: "Restore original template?",
            body: `Your edited Default template for ${TEMPLATE_NAMES[kind]} will be replaced with the original. Messages already sent won’t change.`,
            items: ["Custom templates aren’t affected"],
            confirmLabel: "Restore original",
            cancelLabel: "Cancel",
          },
        }
      : null,
    secondaryAction:
      own !== undefined ? { label: "Remove this template", kind: "remove" } : { label: "Cancel", kind: "cancel" },
    removeDialog:
      own !== undefined
        ? {
            title: "Remove this template?",
            body: `${name} will get the Default template. Messages already sent won’t change.`,
            confirmLabel: "Remove template",
            cancelLabel: "Cancel",
          }
        : null,
    labels: labelsSheet(input),
    sectionLabels:
      kind === "MONTHLY" && person
        ? buildSectionLabels({
            personId: person.personId,
            month: input.month,
            configs: input.configs,
            templates,
            people: input.people,
          })
        : null,
  };
}
