import type { ChargePaymentResponse, PaymentOptionsResponse } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import {
  choosePayment,
  markPaidFormSchema,
  toAmountState,
  toForOptions,
  toFromOptions,
  toMarkPaidFormValues,
  toSavePaymentRequest,
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

describe('toAmountState on Record payment', () => {
  const record = { ...SHEET, title: 'Record payment', actionLabel: 'Record $950.00' };

  it('keeps the sheet button for the expected amount', () => {
    expect(toAmountState(record, 95000, 'Record').actionLabel).toBe('Record $950.00');
  });

  it('names the amount typed with Record', () => {
    expect(toAmountState(record, 90000, 'Record').actionLabel).toBe('Record $900.00');
  });
});

// Jordan owes rent and utilities; Priya pays her utilities and Sam's.
const sheet = (chargeId: string, expected: string, due: ChargePaymentResponse['due']): ChargePaymentResponse => ({
  ...SHEET,
  chargeId,
  title: 'Record payment',
  expected,
  due,
});
const OPTIONS: PaymentOptionsResponse = {
  month: '2026-11',
  people: [
    {
      personId: 'jordan',
      name: 'Jordan',
      detail: '2 unpaid · $1,050.79',
      charges: [
        { label: 'Rent · Nov', sheet: sheet('jordan-rent', '$950.00', { text: 'Overdue since 1 Nov', tone: 'danger' }) },
        { label: 'Utilities · Nov', sheet: sheet('jordan-utilities', '$100.79', { text: '4 Nov', tone: 'default' }) },
      ],
    },
    {
      personId: 'priya',
      name: 'Priya',
      detail: '2 unpaid · $202.46',
      charges: [
        { label: 'Utilities · Nov', sheet: sheet('priya-utilities', '$120.00', { text: '7 Nov', tone: 'default' }) },
        { label: 'Utilities · Sam · Nov', sheet: sheet('sam-utilities', '$82.46', null) },
      ],
    },
  ],
};

describe('choosePayment', () => {
  const ids = (pick: Parameters<typeof choosePayment>[1]) => {
    const choice = choosePayment(OPTIONS, pick);
    return choice && [choice.person.personId, choice.charge.sheet.chargeId];
  };

  it('has nothing while the lists load or nobody owes', () => {
    expect(choosePayment(undefined, {})).toBeNull();
    expect(choosePayment({ month: '2026-11', people: [] }, {})).toBeNull();
  });

  it('opens on the most urgent person and their first charge', () => {
    expect(ids({})).toEqual(['jordan', 'jordan-rent']);
  });

  it("opens on a person's first charge", () => {
    expect(ids({ personId: 'priya' })).toEqual(['priya', 'priya-utilities']);
  });

  it('opens on a charge with its payer chosen, even a charge paid through them', () => {
    expect(ids({ chargeId: 'sam-utilities' })).toEqual(['priya', 'sam-utilities']);
  });

  it('falls back to the first when the chosen ones are gone', () => {
    expect(ids({ personId: 'sam', chargeId: 'paid-already' })).toEqual(['jordan', 'jordan-rent']);
  });
});

describe('toFromOptions and toForOptions', () => {
  it('lists people with their detail line', () => {
    expect(toFromOptions(OPTIONS)[0]).toEqual({ label: 'Jordan', value: 'jordan', detail: '2 unpaid · $1,050.79' });
    expect(toFromOptions(undefined)).toEqual([]);
  });

  it('lists charges with the amount on the right and the due line, red while overdue', () => {
    expect(toForOptions(OPTIONS.people[0])[0]).toEqual({
      label: 'Rent · Nov',
      value: 'jordan-rent',
      trailing: '$950.00',
      detail: 'Overdue since 1 Nov',
      detailTone: 'danger',
    });
    expect(toForOptions(OPTIONS.people[1])[1]).toMatchObject({ detail: undefined, detailTone: undefined });
    expect(toForOptions(null)).toEqual([]);
  });
});
