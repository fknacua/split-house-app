import { describe, expect, it } from 'vitest';

import type { TemplateEditorResponse } from '@splithouse/shared';
import { hasTemplateChanges, insertAtCursor, templateFormSchema, toTemplateDraft, toTemplateFormValues } from './helpers';

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
