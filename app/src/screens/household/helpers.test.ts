import { describe, expect, it } from 'vitest';

import { toRecurringEdit, toRecurringValues } from './helpers';

const CHARGE = {
  chargeId: 'c',
  label: 'Parking',
  amountCents: 1000,
  personId: 'p',
  endMonth: '2027-03',
  removeDialog: { title: 'Remove Parking?', body: 'Parking stops.' },
};

describe('toRecurringValues', () => {
  it('starts a new charge empty', () => {
    expect(toRecurringValues(null)).toEqual({ label: '', amountCents: null, personId: '', endMonth: '' });
  });

  it('fills a saved charge', () => {
    expect(toRecurringValues(CHARGE)).toEqual({ label: 'Parking', amountCents: 1000, personId: 'p', endMonth: '2027-03' });
  });

  it('reads no end month as empty', () => {
    expect(toRecurringValues({ ...CHARGE, endMonth: null }).endMonth).toBe('');
  });
});

describe('toRecurringEdit', () => {
  it('sends an empty select and month as null', () => {
    expect(toRecurringEdit(toRecurringValues(null), null)).toEqual({
      kind: 'recurring',
      chargeId: null,
      label: '',
      amountCents: null,
      personId: null,
      endMonth: null,
    });
  });

  it('sends the saved charge with its values', () => {
    expect(toRecurringEdit(toRecurringValues(CHARGE), 'c')).toMatchObject({ chargeId: 'c', personId: 'p', endMonth: '2027-03' });
  });
});
