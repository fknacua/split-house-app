import { describe, expect, it } from 'vitest';
import type { AddChargeValues } from '@splithouse/shared';

import {
  fieldErrors,
  isChanged,
  newIdempotencyKey,
  UNTOUCHED,
  withCustomAmount,
  withShare,
  withTypedCustom,
  withTypedShares,
} from './helpers';

const OPENING: AddChargeValues = {
  kind: null,
  label: '',
  amountCents: null,
  scope: 'SHARED',
  personId: null,
  split: 'EQUAL',
  customAmounts: [],
  shares: [],
  dueDate: null,
};
const SHOW_OTHER = { label: true, scope: true, who: false, split: true };
const ALL_TOUCHED = { label: true, amount: true, dueDate: true };

describe('fieldErrors', () => {
  it('shows nothing on a fresh sheet', () => {
    expect(fieldErrors(OPENING, UNTOUCHED, SHOW_OTHER)).toEqual({});
  });

  it('shows each error in the board’s words once its field was left empty', () => {
    expect(fieldErrors(OPENING, ALL_TOUCHED, SHOW_OTHER)).toEqual({
      label: 'Add a label',
      amount: 'Enter an amount above $0.00',
      dueDate: 'Pick a due date',
    });
  });

  it('refuses a $0 amount and a blank label', () => {
    expect(fieldErrors({ ...OPENING, label: '  ', amountCents: 0 }, ALL_TOUCHED, SHOW_OTHER)).toMatchObject({
      label: 'Add a label',
      amount: 'Enter an amount above $0.00',
    });
  });

  it('has no label error while the label is not shown (aircon)', () => {
    expect(fieldErrors(OPENING, ALL_TOUCHED, { ...SHOW_OTHER, label: false }).label).toBeUndefined();
  });

  it('clears once the fields are filled', () => {
    const filled = { ...OPENING, label: 'Fridge repair', amountCents: 12000, dueDate: '2026-12-05' };
    expect(fieldErrors(filled, ALL_TOUCHED, SHOW_OTHER)).toEqual({});
  });
});

describe('withCustomAmount', () => {
  const ROWS = [
    { personId: 'person-alex', label: 'You', amountCents: 25000 },
    { personId: 'person-sam', label: 'Sam · via Priya', amountCents: 25000 },
  ];

  it('takes the server’s amounts on the first change, so the others stay', () => {
    expect(withCustomAmount(OPENING, ROWS, 'person-sam', 10000).customAmounts).toEqual([
      { personId: 'person-alex', amountCents: 25000 },
      { personId: 'person-sam', amountCents: 10000 },
    ]);
  });

  it('then changes only the one typed in', () => {
    const once = withCustomAmount(OPENING, ROWS, 'person-sam', 10000);
    expect(withCustomAmount(once, ROWS, 'person-alex', null).customAmounts).toEqual([
      { personId: 'person-sam', amountCents: 10000 },
      { personId: 'person-alex', amountCents: null },
    ]);
  });
});

describe('withShare', () => {
  const ROWS = [
    { personId: 'person-alex', label: 'You', shares: 1500 },
    { personId: 'person-jordan', label: 'Jordan', shares: 1000 },
  ];

  it('takes the household’s shares on the first change, then changes only the one edited', () => {
    expect(withShare(OPENING, ROWS, 'person-jordan', 2000).shares).toEqual([
      { personId: 'person-alex', shares: 1500 },
      { personId: 'person-jordan', shares: 2000 },
    ]);
  });
});

describe('isChanged', () => {
  it('is false as the sheet opened and true once something is entered', () => {
    expect(isChanged(OPENING, OPENING)).toBe(false);
    expect(isChanged({ ...OPENING, kind: 'AIRCON' }, OPENING)).toBe(true);
  });
});

describe('newIdempotencyKey', () => {
  it('is long enough for the server and different each time', () => {
    const a = newIdempotencyKey();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(newIdempotencyKey()).not.toBe(a);
  });
});

describe('withTypedCustom and withTypedShares', () => {
  const CUSTOM = {
    heading: 'Amounts',
    rows: [
      { personId: 'person-alex', label: 'You', amountCents: 25000 },
      { personId: 'person-sam', label: 'Sam · via Priya', amountCents: 25000 },
    ],
    alert: null,
  };
  const SHARES = { heading: 'Shares', rows: [{ personId: 'person-alex', label: 'You', shares: 1500 }], alert: null };

  it('keeps the server’s values while nothing is typed', () => {
    expect(withTypedCustom(CUSTOM, [])).toBe(CUSTOM);
    expect(withTypedShares(SHARES, [])).toBe(SHARES);
  });

  it('shows the typed values once there are some, empty for anyone left out', () => {
    expect(withTypedCustom(CUSTOM, [{ personId: 'person-sam', amountCents: 100 }]).rows.map((r) => r.amountCents)).toEqual([null, 100]);
    expect(withTypedShares(SHARES, [{ personId: 'person-alex', shares: 2000 }]).rows[0].shares).toBe(2000);
  });
});
