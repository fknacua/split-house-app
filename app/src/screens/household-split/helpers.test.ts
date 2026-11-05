import { describe, expect, it } from 'vitest';

import type { HouseholdSplitFormResponse } from '@splithouse/shared';
import {
  bpsFromOwnerPercent,
  bpsFromPrimaryPercent,
  hasSplitChanges,
  ownerPercentOf,
  primaryCountFromOwner,
  primaryCountFromSlider,
  primaryPercentOf,
  shownCounts,
  sliderCountOf,
  sliderPercentOf,
  sliderRangeOf,
  toSplitEdit,
  toSplitFormValues,
} from './helpers';

const amount = { left: '3', owner: '1.5 shares', primary: '1.5 shares' };
const counts = { left: 3000, owner: 1500, primary: 1500 };
const form: HouseholdSplitFormResponse = {
  title: 'Household split',
  datedTitle: 'From December 2026',
  pendingNote: null,
  splitTitle: 'Split between you and Priya',
  owner: { name: 'You', color: 'TEAL' },
  primary: { name: 'Priya', color: 'BLUE' },
  values: {
    tenantShares: [{ personId: 'person-sam', name: 'Sam', color: 'ORANGE', utilityShares: 1000 }],
    totalShares: 5000,
    rentPrimaryBps: 5000,
  },
  rent: { title: 'Rent (SGD)', rows: [], leftLabel: 'Shared rent' },
  utilities: { title: 'Utilities (shares)', totalLabel: 'Total shares', leftLabel: 'Left to split' },
  aircon: { title: 'Aircon (units)', rows: [], leftLabel: 'Left to split', totalLabel: 'Total units', total: '6' },
  amounts: {
    rent: amount,
    utilities: { ...amount, counts },
    aircon: { ...amount, counts: { left: 4000, owner: 2000, primary: 2000 } },
  },
};

describe('toSplitFormValues and toSplitEdit', () => {
  it('sends the whole form, leaving out the display names and colors', () => {
    expect(toSplitEdit(toSplitFormValues(form))).toEqual({
      kind: 'split',
      tenantShares: [{ personId: 'person-sam', utilityShares: 1000 }],
      totalShares: 5000,
      rentPrimaryBps: 5000,
    });
  });

  it('sends an empty field as null, for the server to refuse', () => {
    const values = { ...toSplitFormValues(form), totalShares: null, rentPrimaryBps: null };
    expect(toSplitEdit(values)).toMatchObject({ totalShares: null, rentPrimaryBps: null });
  });

  it('sends a count only once one is typed', () => {
    const values = { ...toSplitFormValues(form), utilitiesPrimaryShares: 1200, airconPrimaryUnits: 0 };
    expect(toSplitEdit(values)).toMatchObject({ utilitiesPrimaryShares: 1200, airconPrimaryUnits: 0 });
  });
});

describe('hasSplitChanges', () => {
  const values = toSplitFormValues(form);

  it('is false as the form opened', () => {
    expect(hasSplitChanges(values, form)).toBe(false);
  });

  it('is true once a value differs, and false again when it goes back', () => {
    expect(hasSplitChanges({ ...values, rentPrimaryBps: 4000 }, form)).toBe(true);
    expect(hasSplitChanges({ ...values, tenantShares: [{ personId: 'person-sam', utilityShares: 0 }] }, form)).toBe(true);
    expect(hasSplitChanges({ ...values, rentPrimaryBps: 5000 }, form)).toBe(false);
  });

  it('is true for a new count on either card, including 0 and a cleared one', () => {
    expect(hasSplitChanges({ ...values, utilitiesPrimaryShares: 1200 }, form)).toBe(true);
    expect(hasSplitChanges({ ...values, utilitiesPrimaryShares: null }, form)).toBe(true);
    expect(hasSplitChanges({ ...values, airconPrimaryUnits: 0 }, form)).toBe(true);
  });

  it('is false for a count typed back to the saved one', () => {
    expect(hasSplitChanges({ ...values, utilitiesPrimaryShares: 1500, airconPrimaryUnits: 2000 }, form)).toBe(false);
  });
});

describe('shownCounts', () => {
  it('shows the server’s counts until one is typed', () => {
    expect(shownCounts(undefined, counts)).toEqual({ owner: 1500, primary: 1500 });
  });

  it('gives the owner the rest of a typed count, and follows what is left', () => {
    expect(shownCounts(1200, counts)).toEqual({ owner: 1800, primary: 1200 });
    expect(shownCounts(1200, { left: 4000, owner: 2800, primary: 1200 })).toEqual({ owner: 2800, primary: 1200 });
  });

  it('shows 0 at either end', () => {
    expect(shownCounts(3000, counts)).toEqual({ owner: 0, primary: 3000 });
    expect(shownCounts(0, counts)).toEqual({ owner: 3000, primary: 0 });
  });

  it('empties both when one is cleared or nothing is left', () => {
    expect(shownCounts(null, counts)).toEqual({ owner: null, primary: null });
    expect(shownCounts(undefined, { left: 0, owner: 0, primary: 0 })).toEqual({ owner: null, primary: null });
  });

  it('leaves the other field empty rather than show below zero', () => {
    expect(shownCounts(5000, counts)).toEqual({ owner: null, primary: 5000 });
    expect(shownCounts(primaryCountFromOwner(5000, 3000), counts)).toEqual({ owner: 5000, primary: null });
  });
});

describe('the count slider', () => {
  it('runs in half steps from 0 to all of what is left', () => {
    expect(sliderRangeOf(3000)).toEqual({ min: 0, max: 3000, step: 500 });
  });

  it('has a last stop that reaches what is left when it isn’t a half step', () => {
    expect(sliderRangeOf(3200)).toEqual({ min: 0, max: 3500, step: 500 });
    expect(primaryCountFromSlider(3500, 3200)).toBe(0);
  });

  it('moves even with half a share left, and has no range with nothing to split', () => {
    expect(sliderRangeOf(500)).toEqual({ min: 0, max: 500, step: 500 });
    expect(sliderRangeOf(0)).toBeNull();
  });

  it('gives all of it to the primary tenant at the left end, as dragged', () => {
    expect(primaryCountFromSlider(0, 3000)).toBe(3000);
    expect(primaryCountFromSlider(3000, 3000)).toBe(0);
    expect(primaryCountFromSlider(2000, 3000)).toBe(1000);
  });

  it('reads the owner’s typed field', () => {
    expect(primaryCountFromOwner(2000, 3000)).toBe(1000);
    expect(primaryCountFromOwner(null, 3000)).toBeNull();
  });

  it('stays on its track whatever is typed', () => {
    const range = { min: 0, max: 3000 };
    expect(sliderCountOf(1800, counts, range)).toBe(1800);
    expect(sliderCountOf(5000, counts, range)).toBe(3000);
    expect(sliderCountOf(0, counts, range)).toBe(0);
    expect(sliderCountOf(null, counts, range)).toBe(1500);
  });
});

describe('the percent fields', () => {
  it('always add to 100', () => {
    expect(primaryPercentOf(4000)).toBe(40);
    expect(ownerPercentOf(4000)).toBe(60);
  });

  it('show 0 at either end', () => {
    expect(primaryPercentOf(0)).toBe(0);
    expect(ownerPercentOf(0)).toBe(100);
    expect(ownerPercentOf(10000)).toBe(0);
  });

  it('are both empty while one is cleared', () => {
    expect(primaryPercentOf(null)).toBeNull();
    expect(ownerPercentOf(null)).toBeNull();
    expect(bpsFromOwnerPercent(null)).toBeNull();
    expect(bpsFromPrimaryPercent(null)).toBeNull();
  });

  it('turn what is typed into the primary tenant’s basis points, from either side', () => {
    expect(bpsFromPrimaryPercent(40)).toBe(4000);
    expect(bpsFromOwnerPercent(60)).toBe(4000);
    expect(bpsFromOwnerPercent(0)).toBe(10000);
  });

  it('leave the other field empty rather than show below zero', () => {
    expect(ownerPercentOf(bpsFromPrimaryPercent(150))).toBeNull();
    expect(primaryPercentOf(bpsFromOwnerPercent(150))).toBeNull();
    expect(primaryPercentOf(bpsFromPrimaryPercent(150))).toBe(150);
  });
});

describe('sliderPercentOf', () => {
  it('sits at the owner’s percent, including both ends', () => {
    expect(sliderPercentOf(4000, 5000)).toBe(60);
    expect(sliderPercentOf(0, 5000)).toBe(100);
    expect(sliderPercentOf(10000, 5000)).toBe(0);
  });

  it('stays on the saved value while the field is empty', () => {
    expect(sliderPercentOf(null, 4000)).toBe(60);
  });

  it('stays on its track whatever is typed', () => {
    expect(sliderPercentOf(15000, 5000)).toBe(0);
    expect(sliderPercentOf(-5000, 5000)).toBe(100);
  });
});
