import { describe, expect, it, vi } from 'vitest';

import { reviewFormSchema, toReviewFormValues, toSaveBillRequest } from './helpers';

// Hoisted above the imports by vitest: the helpers pull in the native picker and the component barrel.
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));
vi.mock('@/components', () => ({ EMPTY_DATE_RANGE: { start: '', end: '' } }));

const READ = {
  currentChargesCents: 41230,
  billMonth: '2026-11',
  dueDate: '2026-11-16',
  billingPeriodStart: '2026-10-01',
  billingPeriodEnd: '2026-10-31',
  lines: [{ label: 'Electricity', cents: 26845 }],
};

describe('toReviewFormValues and toSaveBillRequest', () => {
  it('round-trips a clean read', () => {
    expect(toSaveBillRequest(toReviewFormValues(READ))).toEqual(READ);
  });

  it('turns empty fields into nulls and trims line names', () => {
    const values = toReviewFormValues({
      ...READ,
      billMonth: null,
      dueDate: null,
      billingPeriodEnd: null,
      lines: [{ label: ' Gas ', cents: null }],
    });
    expect(values.billingPeriod).toEqual({ start: '', end: '' });
    expect(toSaveBillRequest(values)).toEqual({
      ...READ,
      billMonth: null,
      dueDate: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      lines: [{ label: 'Gas', cents: null }],
    });
  });
});

describe('reviewFormSchema', () => {
  it('needs a name on every line and Current Charges above zero', () => {
    const values = toReviewFormValues({ ...READ, currentChargesCents: 0, lines: [{ label: ' ', cents: 100 }] });
    const result = reviewFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['currentChargesCents', 'lines.0.label']);
  });
});

describe('Current Charges required', () => {
  it('is an error when empty', () => {
    const result = reviewFormSchema.safeParse({ ...toReviewFormValues(READ), currentChargesCents: null });
    expect(result.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['currentChargesCents', 'Enter Current Charges'],
    ]);
  });
});

describe('bill month text', () => {
  it('shows the month read from the bill as its short name and year', () => {
    expect(toReviewFormValues(READ).billMonth).toBe('Nov 2026');
  });

  it('turns what is typed back into a month key', () => {
    const values = { ...toReviewFormValues(READ), billMonth: ' Oct 2026 ' };
    expect(toSaveBillRequest(values).billMonth).toBe('2026-10');
  });

  it('accepts an empty bill month but not text that is not a month', () => {
    const values = toReviewFormValues(READ);
    expect(reviewFormSchema.safeParse({ ...values, billMonth: '' }).success).toBe(true);
    const result = reviewFormSchema.safeParse({ ...values, billMonth: 'Octo 2026' });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['billMonth']);
  });
});
