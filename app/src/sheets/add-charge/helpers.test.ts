import { describe, expect, it } from 'vitest';
import type { AddChargeSheet, AddChargeValues } from '@splithouse/shared';

import {
  correctionPicks,
  fieldErrors,
  isChanged,
  newIdempotencyKey,
  UNTOUCHED,
  withCustomAmount,
  withShare,
  withTypedCustom,
  withCorrectionCharge,
  withCorrectionMonth,
  withCorrectionPerson,
  withTypedShares,
} from './helpers';

const OPENING: AddChargeValues = {
  mode: 'CHARGE',
  correction: { personId: null, month: null, chargeId: null, amountCents: null, dueDate: '2026-11-24' },
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

describe('Correction mode picks', () => {
  const SELECTS: AddChargeSheet['correction'] = {
    locked: false,
    person: { placeholder: 'Select person' },
    month: { placeholder: 'Select month' },
    charge: { placeholder: 'Select charge' },
    people: [
      {
        personId: 'sam',
        name: 'Sam',
        months: [
          { month: '2026-10', label: 'Oct 2026', charges: [{ chargeId: 'oct-aircon', label: 'Aircon servicing · $18.33' }] },
          { month: '2026-09', label: 'Sep 2026', charges: [{ chargeId: 'sep-utilities', label: 'Utilities · $82.46' }] },
        ],
      },
      {
        personId: 'jordan',
        name: 'Jordan',
        months: [{ month: '2026-10', label: 'Oct 2026', charges: [{ chargeId: 'oct-fridge', label: 'Fridge repair · $30.00' }] }],
      },
    ],
  };
  const PICKED: AddChargeValues = {
    ...OPENING,
    mode: 'CORRECTION',
    correction: { personId: 'sam', month: '2026-09', chargeId: 'sep-utilities', amountCents: 7746, dueDate: '2026-11-24' },
  };

  it('lists people, then the picked person’s months, then the picked month’s charges', () => {
    expect(correctionPicks(SELECTS, OPENING.correction)).toEqual({
      people: [
        { label: 'Sam', value: 'sam' },
        { label: 'Jordan', value: 'jordan' },
      ],
      months: [],
      charges: [],
      labels: { person: '', month: '', charge: '' },
    });
    const picks = correctionPicks(SELECTS, PICKED.correction);
    expect(picks.months).toEqual([
      { label: 'Oct 2026', value: '2026-10' },
      { label: 'Sep 2026', value: '2026-09' },
    ]);
    expect(picks.charges).toEqual([{ label: 'Utilities · $82.46', value: 'sep-utilities' }]);
    expect(picks.labels).toEqual({ person: 'Sam', month: 'Sep 2026', charge: 'Utilities · $82.46' });
  });

  it('a new person starts the month, the charge and the amount again; the due date stays', () => {
    expect(withCorrectionPerson(PICKED, 'jordan').correction).toEqual({
      personId: 'jordan',
      month: null,
      chargeId: null,
      amountCents: null,
      dueDate: '2026-11-24',
    });
  });

  it('a new month starts the charge and the amount again', () => {
    expect(withCorrectionMonth(PICKED, '2026-10').correction).toMatchObject({ personId: 'sam', month: '2026-10', chargeId: null, amountCents: null });
  });

  it('a new charge starts the amount again, since it is compared with that charge', () => {
    expect(withCorrectionCharge(PICKED, 'sep-utilities').correction).toMatchObject({ chargeId: 'sep-utilities', amountCents: null });
  });

  it('an empty pick reads as nothing picked', () => {
    expect(withCorrectionPerson(PICKED, '').correction.personId).toBeNull();
    expect(withCorrectionCharge(PICKED, '').correction.chargeId).toBeNull();
  });

  it('leaves Charge mode’s fields as they are', () => {
    const charge = { ...PICKED, kind: 'ONE_OFF' as const, label: 'Fridge repair' };
    expect(withCorrectionMonth(charge, '2026-10')).toMatchObject({ kind: 'ONE_OFF', label: 'Fridge repair' });
  });
});
