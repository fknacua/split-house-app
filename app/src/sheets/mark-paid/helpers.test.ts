import type { ChargePaymentResponse } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import { markPaidFormSchema, toMarkPaidFormValues, toSavePaymentRequest } from './helpers';

const SHEET: ChargePaymentResponse = {
  chargeId: 'charge-jordan-rent',
  title: 'Mark paid',
  subtitle: 'Rent · Jordan · November',
  expected: '$950.00',
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

describe('toSavePaymentRequest', () => {
  it('sends the amount and the day', () => {
    expect(toSavePaymentRequest({ paidCents: 90000, paidOn: '2026-11-02' })).toEqual({
      paidCents: 90000,
      paidOn: '2026-11-02',
    });
  });
});
