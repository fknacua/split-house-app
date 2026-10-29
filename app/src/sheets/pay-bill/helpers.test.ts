import { todayKey, type BillPaySheet } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import { payBillFormSchema, toMarkBillPaidRequest, toPayBillFormValues } from './helpers';

const SHEET: BillPaySheet = {
  subtitle: 'Utilities bill · November',
  currentCharges: '$412.30',
  due: '16 Nov',
  amountCents: 41230,
  note: { tone: 'warning', text: 'You’ve collected $123.69 so far.' },
  actionLabel: 'Mark as paid',
};

describe('toPayBillFormValues', () => {
  it('fills in Current Charges and today', () => {
    expect(toPayBillFormValues(SHEET)).toEqual({ paidCents: 41230, paidOn: todayKey() });
  });
});

describe('payBillFormSchema', () => {
  it('passes the filled-in form', () => {
    expect(payBillFormSchema.safeParse(toPayBillFormValues(SHEET)).success).toBe(true);
  });

  it.each([
    ['an empty amount', { paidCents: null, paidOn: '2026-11-16' }, 'Enter the amount you paid'],
    ['an amount of zero', { paidCents: 0, paidOn: '2026-11-16' }, 'Enter an amount above $0.00'],
    ['no day', { paidCents: 41230, paidOn: '' }, 'Enter the day you paid'],
  ])('rejects %s', (_name, values, message) => {
    const result = payBillFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe('toMarkBillPaidRequest', () => {
  it('sends the amount and the day', () => {
    expect(toMarkBillPaidRequest({ paidCents: 41000, paidOn: '2026-11-16' })).toEqual({
      paidCents: 41000,
      paidOn: '2026-11-16',
    });
  });
});
