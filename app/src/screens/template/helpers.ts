import { z } from 'zod';

import { templateMessageSchema, type TemplateEditorResponse, type TemplatePreviewRequest } from '@splithouse/shared';

/** The template editor's form rules: the shared message schema, so the field checks as the user types what the server checks on save. */
export const templateFormSchema = z.object({ text: templateMessageSchema });

/** The template editor's values. */
export interface TemplateFormValues {
  text: string;
}

/** A cursor or selected range in the text. */
export interface TextSelection {
  start: number;
  end: number;
}

/**
 * Fills the form from the server's response.
 *
 * @param form The editor response.
 * @returns The form's values.
 */
export function toTemplateFormValues(form: TemplateEditorResponse): TemplateFormValues {
  return { text: form.text };
}

/**
 * Builds the draft from the form, for the preview and the save alike.
 *
 * @param values The form's values.
 * @param form The editor response.
 * @returns The draft.
 */
export function toTemplateDraft(values: TemplateFormValues, form: TemplateEditorResponse): TemplatePreviewRequest {
  return { template: form.kind, personId: form.personId, text: values.text };
}

/**
 * Whether leaving would lose anything.
 *
 * @param values The form's values.
 * @param form The editor response the form opened on.
 * @returns True when the text differs from what it opened on.
 */
export function hasTemplateChanges(values: TemplateFormValues, form: TemplateEditorResponse): boolean {
  return values.text !== form.text;
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
