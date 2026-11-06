import { describe, expect, it } from 'vitest';

import type { TemplateEditorResponse } from '@splithouse/shared';
import {
  hasLabelsChanges,
  hasTemplateChanges,
  sectionLabelOf,
  insertAtCursor,
  templateFormSchema,
  toLabelsFormValues,
  toSectionLabels,
  toTemplateDraft,
  toTemplateFormValues,
} from './helpers';

const FORM = {
  kind: 'MONTHLY',
  personId: null,
  text: 'Hi {name}!',
} as TemplateEditorResponse;

describe('toTemplateFormValues', () => {
  it('fills the text', () => {
    expect(toTemplateFormValues(FORM)).toEqual({ text: 'Hi {name}!' });
  });
});

describe('toTemplateDraft', () => {
  it('sends the text as written', () => {
    expect(toTemplateDraft({ text: ' Hi ' }, FORM)).toEqual({ template: 'MONTHLY', personId: null, text: ' Hi ' });
  });
});

describe('hasTemplateChanges', () => {
  it.each([
    ['nothing changed', 'Hi {name}!', false],
    ['the text changed', 'Hi', true],
  ])('%s', (_name, text, expected) => {
    expect(hasTemplateChanges({ text }, FORM)).toBe(expected);
  });
});

describe('insertAtCursor', () => {
  it.each([
    ['at the start', { start: 0, end: 0 }, '{x}Hi there', 3],
    ['in the middle', { start: 2, end: 2 }, 'Hi{x} there', 5],
    ['at the end', { start: 8, end: 8 }, 'Hi there{x}', 11],
    ['over selected text', { start: 3, end: 8 }, 'Hi {x}', 6],
    ['past the end', { start: 99, end: 99 }, 'Hi there{x}', 11],
  ])('inserts %s', (_name, selection, text, cursor) => {
    expect(insertAtCursor('Hi there', selection, '{x}')).toEqual({ text, cursor });
  });
});

describe('templateFormSchema', () => {
  it('checks the text with the shared message rule', () => {
    expect(templateFormSchema.safeParse({ text: 'Hi {name}' }).success).toBe(true);
    expect(templateFormSchema.safeParse({ text: '  ' }).error?.issues[0]?.message).toBe('Message can’t be empty');
  });
});

const LABELS = {
  title: 'Line labels',
  hint: 'How each charge is named in {lines}.',
  sharedNote: 'Shared with Nudge templates',
  rows: [
    { type: 'RENT', label: 'Rent', value: 'Rent' },
    { type: 'UTILITIES', label: 'Utilities bill', value: 'PUB' },
    { type: 'AIRCON', label: 'Aircon servicing', value: 'Aircon servicing' },
  ],
} as TemplateEditorResponse['labels'];

describe('toLabelsFormValues', () => {
  it('fills every label and leaves the section titles out', () => {
    expect(toLabelsFormValues(LABELS)).toEqual({
      lineLabels: { RENT: 'Rent', UTILITIES: 'PUB', AIRCON: 'Aircon servicing' },
    });
  });
});

describe('hasLabelsChanges', () => {
  it('is false on what the sheet opened on and true after an edit', () => {
    const values = toLabelsFormValues(LABELS);
    expect(hasLabelsChanges(values, LABELS)).toBe(false);
    expect(hasLabelsChanges({ lineLabels: { ...values.lineLabels, RENT: 'Upa' } }, LABELS)).toBe(true);
  });
});

const SECTION_LABELS = {
  title: 'Section labels',
  hint: 'This person is set to pay for another person(s).',
  rows: [
    { personId: 'p1', label: 'Alex’s charges', value: 'Master Bedroom Share', placeholder: 'Yours', lines: [], subtotal: '$0.00' },
    { personId: 'p2', label: 'Sam’s charges', value: '', placeholder: 'Sam’s (please collect)', lines: [], subtotal: '$0.00' },
  ],
};

describe('toSectionLabels', () => {
  it('fills the saved labels by person', () => {
    expect(toSectionLabels(SECTION_LABELS)).toEqual({ p1: 'Master Bedroom Share', p2: '' });
  });
});

describe('sectionLabelOf', () => {
  const row = SECTION_LABELS.rows[1];

  it('uses the custom label, else the usual one', () => {
    expect(sectionLabelOf({ p2: 'Room 3 Share' }, row)).toBe('Room 3 Share');
    expect(sectionLabelOf({ p2: '  ' }, row)).toBe('Sam’s (please collect)');
    expect(sectionLabelOf({}, row)).toBe('Sam’s (please collect)');
  });
});
