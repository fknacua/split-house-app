import { describe, expect, it, vi } from 'vitest';

import { billMonthOptions, reviewFormSchema, toReviewFormValues, toSaveBillRequest } from './helpers';

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

describe('billMonthOptions', () => {
  it('lists the next month back a year, newest first', () => {
    const months = billMonthOptions('2026-11', '');
    expect(months).toHaveLength(13);
    expect(months[0]).toBe('2026-12');
    expect(months.at(-1)).toBe('2025-12');
  });

  it('adds the month read from the bill when it is outside the list', () => {
    expect(billMonthOptions('2026-11', '2024-05').at(-1)).toBe('2024-05');
  });
});
