import { describe, expect, it } from 'vitest';

import type { TemplateFormResponse } from '@splithouse/shared';
import { hasTemplateChanges, insertAtCursor, toTemplateDraft, toTemplateFormValues } from './helpers';

const FORM = {
  kind: 'MONTHLY',
  personId: null,
  text: 'Hi {name}!',
  lineLabels: {
    rows: [
      { type: 'RENT', label: 'Rent', value: 'Rent' },
      { type: 'UTILITIES', label: 'Utilities bill', value: 'PUB' },
    ],
  },
} as TemplateFormResponse;

describe('toTemplateFormValues', () => {
  it('fills the text and a label per row', () => {
    expect(toTemplateFormValues(FORM)).toEqual({ text: 'Hi {name}!', lineLabels: { RENT: 'Rent', UTILITIES: 'PUB' } });
  });
});

describe('toTemplateDraft', () => {
  it('sends the whole form as written', () => {
    expect(toTemplateDraft({ text: ' Hi ', lineLabels: { RENT: 'Upa' } }, FORM)).toEqual({
      template: 'MONTHLY',
      personId: null,
      text: ' Hi ',
      lineLabels: { RENT: 'Upa' },
    });
  });
});

describe('hasTemplateChanges', () => {
  const values = toTemplateFormValues(FORM);

  it.each([
    ['nothing changed', values, false],
    ['the text changed', { ...values, text: 'Hi' }, true],
    ['a label changed', { ...values, lineLabels: { ...values.lineLabels, UTILITIES: 'Kuryente' } }, true],
  ])('%s', (_name, changed, expected) => {
    expect(hasTemplateChanges(changed, FORM)).toBe(expected);
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
