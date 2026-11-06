import { z } from 'zod';

import {
  templateLabelsSaveRequestSchema,
  templateMessageSchema,
  type TemplateEditorResponse,
  type TemplatePreviewRequest,
} from '@splithouse/shared';
import type { SectionLabels, SectionLabelsBlock } from './types';

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

/** The Line labels sheet's values: the request it saves, so the shared schema checks them as the user types. */
export type LabelsFormValues = z.input<typeof templateLabelsSaveRequestSchema>;

/**
 * Fills the Line labels sheet from the server's response.
 *
 * @param labels The editor response's `labels`.
 * @returns Every label. Section titles are edited in the editor's Section titles accordion, not here.
 */
export function toLabelsFormValues(labels: TemplateEditorResponse['labels']): LabelsFormValues {
  return { lineLabels: Object.fromEntries(labels.rows.map((row) => [row.type, row.value])) };
}

/**
 * Whether the sheet has anything to save.
 *
 * @param values The sheet's values.
 * @param labels The editor response's `labels` the sheet opened on.
 * @returns True when a label differs from what the sheet opened on.
 */
export function hasLabelsChanges(values: LabelsFormValues, labels: TemplateEditorResponse['labels']): boolean {
  return JSON.stringify(values) !== JSON.stringify(toLabelsFormValues(labels));
}

/**
 * The label a section shows: the custom one, else the usual one the server sends as the field's placeholder.
 *
 * @param labels The labels by person.
 * @param row The section.
 * @returns e.g. `Master Bedroom Share`, or `Yours` when blank.
 */
export function sectionLabelOf(labels: SectionLabels, row: SectionLabelsBlock['rows'][number]): string {
  return labels[row.personId]?.trim() || row.placeholder;
}

/**
 * Fills the Section labels sheet from the server's response.
 *
 * @param block The editor response's `sectionLabels`.
 * @returns The saved labels by person, empty for the usual one.
 */
export function toSectionLabels(block: SectionLabelsBlock): SectionLabels {
  return Object.fromEntries(block.rows.map((row) => [row.personId, row.value]));
}
