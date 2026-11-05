import type { LineLabelType, TemplateFormResponse, TemplatePreviewRequest } from '@splithouse/shared';

/** The template editor's values. */
export interface TemplateFormValues {
  text: string;
  /** The label fields, by the charge type they name. */
  lineLabels: Partial<Record<LineLabelType, string>>;
}

/** A cursor or selected range in the text. */
export interface TextSelection {
  start: number;
  end: number;
}

/**
 * Fills the form from the server's response.
 *
 * @param form The form response.
 * @returns The form's values.
 */
export function toTemplateFormValues(form: TemplateFormResponse): TemplateFormValues {
  return {
    text: form.text,
    lineLabels: Object.fromEntries(form.lineLabels.rows.map((row) => [row.type, row.value])),
  };
}

/**
 * Builds the draft from the whole form, for the preview and the save alike. The server decides what changed and checks
 * every field.
 *
 * @param values The form's values.
 * @param form The form response.
 * @returns The draft.
 */
export function toTemplateDraft(values: TemplateFormValues, form: TemplateFormResponse): TemplatePreviewRequest {
  return { template: form.kind, personId: form.personId, text: values.text, lineLabels: values.lineLabels };
}

/**
 * Whether leaving would lose anything.
 *
 * @param values The form's values.
 * @param form The form response the form opened on.
 * @returns True when the text or a label differs from what it opened on.
 */
export function hasTemplateChanges(values: TemplateFormValues, form: TemplateFormResponse): boolean {
  return values.text !== form.text || form.lineLabels.rows.some((row) => values.lineLabels[row.type] !== row.value);
}

/**
 * Puts a placeholder at the cursor, replacing any selected text.
 *
 * @param text The text.
 * @param selection Where the cursor is. Past the end counts as the end.
 * @param placeholder What to insert, e.g. `{name}`.
 * @returns The new text and where the cursor goes: right after the placeholder.
 */
export function insertAtCursor(text: string, selection: TextSelection, placeholder: string): { text: string; cursor: number } {
  const start = Math.min(selection.start, text.length);
  const end = Math.min(selection.end, text.length);
  return { text: text.slice(0, start) + placeholder + text.slice(end), cursor: start + placeholder.length };
}
