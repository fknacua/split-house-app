import { describe, expect, it } from 'vitest';

import { templateMessageSchemas, templateSaveRequestSchema, TEMPLATE_LIMITS } from './templates';

describe('templateMessageSchemas', () => {
  it('accepts a message within the limit', () => {
    expect(templateMessageSchemas.MONTHLY.safeParse('Hi {name}!\n\n{lines}').success).toBe(true);
    expect(templateMessageSchemas.NUDGE.safeParse('x'.repeat(TEMPLATE_LIMITS.NUDGE)).success).toBe(true);
  });

  it('refuses an empty or blank message with its message', () => {
    for (const text of ['', '  \n ']) {
      const result = templateMessageSchemas.MONTHLY.safeParse(text);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toEqual(['Message can’t be empty']);
    }
  });

  it('refuses one over the limit without a message', () => {
    const result = templateMessageSchemas.NUDGE.safeParse('x'.repeat(TEMPLATE_LIMITS.NUDGE + 1));
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(['']);
  });

  it('counts an emoji as 1 toward the limit', () => {
    const text = 'x'.repeat(TEMPLATE_LIMITS.NUDGE - 1) + '👍🏽';
    expect(text.length).toBeGreaterThan(TEMPLATE_LIMITS.NUDGE);
    expect(templateMessageSchemas.NUDGE.safeParse(text).success).toBe(true);
  });

  it('has each template’s own limit', () => {
    const text = 'x'.repeat(TEMPLATE_LIMITS.MONTHLY);
    expect(templateMessageSchemas.MONTHLY.safeParse(text).success).toBe(true);
    expect(templateMessageSchemas.NUDGE.safeParse(text).success).toBe(false);
  });
});

describe('templateSaveRequestSchema', () => {
  it('checks the text with the template’s rules', () => {
    const text = 'x'.repeat(TEMPLATE_LIMITS.NUDGE + 1);
    expect(templateSaveRequestSchema.safeParse({ template: 'MONTHLY', personId: null, text }).success).toBe(true);
    expect(templateSaveRequestSchema.safeParse({ template: 'NUDGE', personId: null, text }).success).toBe(false);
    expect(templateSaveRequestSchema.safeParse({ template: 'NUDGE', personId: 'p', text: ' ' }).success).toBe(false);
  });
});
