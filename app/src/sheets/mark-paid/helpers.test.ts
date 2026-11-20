import type { ChargePaymentResponse, RecordPaymentChargeRow } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import {
  markPaidFormSchema,
  toAmountState,
  toMarkPaidFormValues,
  toPaidChargeOptions,
  toSavePaymentRequest,
  toggleAllTicked,
  toggleTicked,
  selectAllState,
} from './helpers';

const SHEET: ChargePaymentResponse = {
  chargeId: 'charge-jordan-rent',
  month: '2026-11',
  title: 'Mark paid',
  subtitle: 'Rent · Jordan · November',
  expected: '$950.00',
  expectedCents: 95000,
  due: { text: 'Overdue since 1 Nov', tone: 'danger' },
  amountCents: 95000,
  paidOn: '2026-11-03',
  actionLabel: 'Mark as paid',
};

describe('toMarkPaidFormValues', () => {
  it('fills in the amount and the day the server sent', () => {
    expect(toMarkPaidFormValues(SHEET)).toEqual({ paidCents: 95000, paidOn: '2026-11-03' });
  });
});

describe('markPaidFormSchema', () => {
  it('passes the filled-in form', () => {
    expect(markPaidFormSchema.safeParse(toMarkPaidFormValues(SHEET)).success).toBe(true);
  });

  it.each([
    ['an empty amount', { paidCents: null, paidOn: '2026-11-03' }, 'Enter the amount received'],
    ['an amount of zero', { paidCents: 0, paidOn: '2026-11-03' }, 'Enter an amount above $0.00'],
    ['no day', { paidCents: 95000, paidOn: '' }, 'Enter the day it was received'],
  ])('rejects %s', (_name, values, message) => {
    const result = markPaidFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe('toAmountState', () => {
  const opened = { helper: 'Change it if they paid a different amount', actionLabel: 'Mark as paid', difference: null };

  it('reads as the sheet opened for the expected amount', () => {
    expect(toAmountState(SHEET, 95000)).toEqual(opened);
  });

  it.each([
    ['an empty field', null],
    ['zero', 0],
  ])('reads as the sheet opened for %s', (_name, paidCents) => {
    expect(toAmountState(SHEET, paidCents)).toEqual(opened);
  });

  it('hides the helper, names the amount on the button and words a shortfall', () => {
    expect(toAmountState(SHEET, 90000)).toEqual({
      helper: null,
      actionLabel: 'Save $900.00',
      difference: {
        kind: 'short',
        title: '$50.00 short of $950.00',
        text: 'November stays $50.00 short until you edit the payment or add a correction.',
      },
    });
  });

  it('words an overpayment', () => {
    expect(toAmountState(SHEET, 97000)).toMatchObject({
      helper: null,
      actionLabel: 'Save $970.00',
      difference: { kind: 'over', title: '$20.00 over $950.00' },
    });
  });
});

describe('toSavePaymentRequest', () => {
  it('sends the amount and the day', () => {
    expect(toSavePaymentRequest({ paidCents: 90000, paidOn: '2026-11-02' })).toEqual({
      paidCents: 90000,
      paidOn: '2026-11-02',
    });
  });
});

describe('toPaidChargeOptions', () => {
  it('lists each paid charge with what was received and its paid line', () => {
    expect(
      toPaidChargeOptions([
        { chargeId: 'priya-rent', title: 'Rent', received: '$1,611.35', detail: 'Paid 27 Nov · $63.65 short' },
        { chargeId: 'sam-utilities', title: 'Utilities · Sam', received: '$82.46', detail: 'Paid 27 Nov' },
      ])
    ).toEqual([
      { label: 'Rent', value: 'priya-rent', trailing: '$1,611.35', detail: 'Paid 27 Nov · $63.65 short' },
      { label: 'Utilities · Sam', value: 'sam-utilities', trailing: '$82.46', detail: 'Paid 27 Nov' },
    ]);
  });
});

// Jordan's For list with only his rent ticked.
const row = (chargeId: string, ticked: boolean): RecordPaymentChargeRow => ({
  chargeId,
  title: chargeId,
  amount: '$1.00',
  detail: null,
  chip: { label: 'Upcoming', tone: 'neutral' },
  ticked,
});
const ROWS = [row('jordan-rent', true), row('jordan-aircon', false), row('jordan-utilities', false)];

describe('toggleTicked', () => {
  it('ticks or unticks one charge, keeping the list order', () => {
    expect(toggleTicked(ROWS, 'jordan-utilities')).toEqual(['jordan-rent', 'jordan-utilities']);
    expect(toggleTicked(ROWS, 'jordan-rent')).toEqual([]);
  });
});

describe('toggleAllTicked and selectAllState', () => {
  it('ticks every charge while some or none are, and clears them once all are', () => {
    expect(toggleAllTicked(ROWS)).toEqual(['jordan-rent', 'jordan-aircon', 'jordan-utilities']);
    expect(toggleAllTicked(ROWS.map((r) => ({ ...r, ticked: true })))).toEqual([]);
    expect(toggleAllTicked(ROWS.map((r) => ({ ...r, ticked: false })))).toHaveLength(3);
  });

  it('reads all, some (part-ticked) or none', () => {
    expect(selectAllState(ROWS.map((r) => ({ ...r, ticked: true })))).toEqual({ value: true, indeterminate: false });
    expect(selectAllState(ROWS)).toEqual({ value: false, indeterminate: true });
    expect(selectAllState(ROWS.map((r) => ({ ...r, ticked: false })))).toEqual({ value: false, indeterminate: false });
    expect(selectAllState([])).toEqual({ value: false, indeterminate: false });
  });
});
