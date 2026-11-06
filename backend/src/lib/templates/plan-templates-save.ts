import { isDeepStrictEqual } from "node:util";
import {
  messageTemplatesSchema,
  type LineLabelType,
  type MessageTemplates,
  type TemplateKind,
  type TemplateLabelsSaveRequest,
  type TemplateSaveRequest,
} from "@splithouse/shared";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { DEFAULT_LINE_LABELS } from "@/lib/messages/line-label";
import { defaultText } from "./template-text";

const textField = (kind: TemplateKind) => (kind === "MONTHLY" ? "monthly" : "nudge");

/**
 * Applies a template save: the Default's text, or a person's custom template, added when they have none. A custom
 * template matching the Default is kept, since the user chose to give that person one.
 *
 * @param templates - The wording the save starts from. Not changed.
 * @param save - The save, already parsed with the shared schema.
 * @returns The new wording.
 */
export function applyTemplateSave(templates: MessageTemplates, save: TemplateSaveRequest): MessageTemplates {
  const { template: kind, personId, text } = save;
  if (personId === null) return { ...templates, [textField(kind)]: text };
  const isTheirs = (o: MessageTemplates["overrides"][number]) => o.personId === personId && o.kind === kind;
  const overrides = templates.overrides.some(isTheirs)
    ? templates.overrides.map((o) => (isTheirs(o) ? { ...o, text } : o))
    : [...templates.overrides, { personId, kind, text }];
  return { ...templates, overrides };
}

/**
 * Removes a person's custom template, so they get the Default again. Removing a monthly one also clears the Section
 * labels of their message, so it goes back to `Yours` and the collect titles.
 *
 * @param templates - The current wording. Not changed.
 * @param kind - The monthly breakdown or the nudge.
 * @param personId - Whose.
 * @returns The new wording, the same when they had none.
 */
export function applyTemplateRemove(templates: MessageTemplates, kind: TemplateKind, personId: string): MessageTemplates {
  const sectionTitles = { ...templates.sectionTitles };
  if (kind === "MONTHLY") delete sectionTitles[personId];
  return {
    ...templates,
    overrides: templates.overrides.filter((o) => !(o.personId === personId && o.kind === kind)),
    sectionTitles,
  };
}

/**
 * Puts the built-in text back as the Default. Custom templates stay.
 *
 * @param templates - The current wording. Not changed.
 * @param kind - The monthly breakdown or the nudge.
 * @returns The new wording.
 */
export function applyTemplateRestore(templates: MessageTemplates, kind: TemplateKind): MessageTemplates {
  return { ...templates, [textField(kind)]: defaultText(DEFAULT_MESSAGE_TEMPLATES, kind) };
}

/**
 * Applies a Line labels or Section labels save. A label matching the default clears the custom one, and so does an
 * empty section label. Fields not sent keep their value.
 *
 * @param templates - The current wording. Not changed.
 * @param save - The save, already parsed with the shared schema, so every label sent is trimmed and not blank.
 * @returns The new wording.
 */
export function applyLabelsSave(templates: MessageTemplates, save: TemplateLabelsSaveRequest): MessageTemplates {
  const lineLabels = { ...templates.lineLabels };
  for (const [type, label] of Object.entries(save.lineLabels) as [LineLabelType, string][]) {
    if (label === DEFAULT_LINE_LABELS[type]) delete lineLabels[type];
    else lineLabels[type] = label;
  }
  const sectionTitles = { ...templates.sectionTitles };
  for (const [recipientId, titles] of Object.entries(save.sectionTitles ?? {})) {
    const message = { ...sectionTitles[recipientId] };
    for (const [personId, title] of Object.entries(titles)) {
      if (title === "") delete message[personId];
      else message[personId] = title;
    }
    if (Object.keys(message).length > 0) sectionTitles[recipientId] = message;
    else delete sectionTitles[recipientId];
  }
  return { ...templates, lineLabels, sectionTitles };
}

/**
 * Checks the new wording and tells whether there is anything to store, so saving the same thing twice is harmless.
 *
 * @param current - The stored wording.
 * @param next - The wording after the change.
 * @returns The wording to store, or null when it matches what is stored.
 * @throws {ZodError} When the result breaks `messageTemplatesSchema`, which the parsed requests already rule out.
 */
export function changedTemplates(current: MessageTemplates, next: MessageTemplates): MessageTemplates | null {
  const parsed = messageTemplatesSchema.parse(next);
  return isDeepStrictEqual(parsed, current) ? null : parsed;
}
