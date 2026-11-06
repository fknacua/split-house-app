import { describe, expect, it } from 'vitest';

import { templateMessageSchema, templateSaveRequestSchema } from './templates';

describe('templateMessageSchema', () => {
  it('accepts any message that isn’t blank, however long', () => {
    expect(templateMessageSchema.safeParse('Hi {name}!\n\n{lines}').success).toBe(true);
    expect(templateMessageSchema.safeParse('x'.repeat(5000)).success).toBe(true);
  });

  it('refuses an empty or blank message with its message', () => {
    for (const text of ['', '  \n ']) {
      const result = templateMessageSchema.safeParse(text);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toEqual(['Message can’t be empty']);
    }
  });
});

describe('templateSaveRequestSchema', () => {
  it('checks the text with the message rule', () => {
    expect(templateSaveRequestSchema.safeParse({ template: 'NUDGE', personId: null, text: 'Hi' }).success).toBe(true);
    expect(templateSaveRequestSchema.safeParse({ template: 'NUDGE', personId: 'p', text: ' ' }).success).toBe(false);
  });
});
