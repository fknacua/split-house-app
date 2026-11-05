import { isDeepStrictEqual } from "node:util";
import {
  messageTemplatesSchema,
  type LineLabelType,
  type MessageTemplates,
  type TemplateSaveRequest,
} from "@splithouse/shared";
import { DEFAULT_LINE_LABELS } from "@/lib/messages/line-label";

/** A person's overrides after a save: replaced in place, added only when it differs from everyone's, or removed by null. */
function nextOverrides(templates: MessageTemplates, save: TemplateSaveRequest & { personId: string }): MessageTemplates["overrides"] {
  const isTheirs = (o: MessageTemplates["overrides"][number]) => o.personId === save.personId && o.kind === save.template;
  if (save.text === null) return templates.overrides.filter((o) => !isTheirs(o));
  const text = save.text;
  if (templates.overrides.some(isTheirs)) return templates.overrides.map((o) => (isTheirs(o) ? { ...o, text } : o));
  const everyones = save.template === "MONTHLY" ? templates.monthly : templates.nudge;
  return text === everyones
    ? templates.overrides
    : [...templates.overrides, { personId: save.personId, kind: save.template, text }];
}

/** The line labels after a save. One matching the default clears the custom label, and a cleared field keeps its saved value, since the plan refuses it first. */
function nextLineLabels(templates: MessageTemplates, sent: TemplateSaveRequest["lineLabels"]): MessageTemplates["lineLabels"] {
  const lineLabels = { ...templates.lineLabels };
  for (const [type, value] of Object.entries(sent ?? {}) as [LineLabelType, string][]) {
    const label = value.trim();
    if (label === "") continue;
    if (label === DEFAULT_LINE_LABELS[type]) delete lineLabels[type];
    else lineLabels[type] = label;
  }
  return lineLabels;
}

/**
 * Applies a template save to the wording. A person with no version of their own only gets one when the text differs
 * from everyone's. The result still has to go through `messageTemplatesSchema`.
 *
 * @param templates - The wording the save starts from. Not changed.
 * @param save - The save. A null `text` removes the person's own version, and does nothing without a person.
 * @returns The new wording.
 */
export function applyTemplatesSave(templates: MessageTemplates, save: TemplateSaveRequest): MessageTemplates {
  const field = save.template === "MONTHLY" ? "monthly" : "nudge";
  const { personId, text } = save;
  return {
    ...templates,
    ...(personId !== null
      ? { overrides: nextOverrides(templates, { ...save, personId }) }
      : text !== null
        ? { [field]: text }
        : {}),
    lineLabels: nextLineLabels(templates, save.lineLabels),
  };
}

/** What a template save would do. The preview returns it and the save stores it. */
export interface TemplatesSavePlan {
  /** The new wording, or null when nothing changes or anything is invalid. */
  next: MessageTemplates | null;
  errors: Record<string, string>;
  canSave: boolean;
}

/** The checks on each field. Placeholders aren't checked: an unknown one stays as typed, so it shows in the preview. */
function fieldErrors(save: TemplateSaveRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  const removesEveryones = save.text === null && save.personId === null;
  if (removesEveryones || save.text?.trim() === "") errors.text = "Write a message.";
  for (const [type, value] of Object.entries(save.lineLabels ?? {})) {
    if (value.trim() === "") errors[`lineLabels.${type}`] = "Enter a label.";
  }
  return errors;
}

/**
 * Works out what a template save would do, for the preview and the save alike. Pure: the service reads the wording and
 * stores the result.
 *
 * @param templates - The current wording.
 * @param save - The save.
 * @returns The new wording, the errors per field and whether Save is allowed.
 */
export function planTemplatesSave(templates: MessageTemplates, save: TemplateSaveRequest): TemplatesSavePlan {
  const errors = fieldErrors(save);
  if (Object.keys(errors).length > 0) return { next: null, errors, canSave: false };

  const parsed = messageTemplatesSchema.safeParse(applyTemplatesSave(templates, save));
  if (!parsed.success) {
    return { next: null, errors: { form: parsed.error.issues[0].message }, canSave: false };
  }
  const next = isDeepStrictEqual(parsed.data, templates) ? null : parsed.data;
  return { next, errors, canSave: next !== null };
}
