import { describe, expect, it } from 'vitest';

import type { HouseholdFormResponse } from '@splithouse/shared';
import {
  hasUnsavedChanges,
  mergeTypedValues,
  personFormSchema,
  toHouseholdEdit,
  toPersonFormValues,
  type PersonFormValues,
} from './helpers';

function formFor(overrides: Partial<HouseholdFormResponse['values']> = {}): HouseholdFormResponse {
  return {
    personId: 'p-jordan',
    title: 'Edit Jordan',
    viewTitle: 'Jordan',
    sub: 'Own room · pays you directly',
    month: '2026-12',
    startsFrom: '2026-12',
    startsFromOptions: ['2026-12', '2027-01'],
    values: {
      name: 'Jordan',
      whatsappE164: '+6581234567',
      color: 'GREEN',
      rentDueDay: 1,
      utilitiesDueDay: 4,
      rentViaPersonId: null,
      utilitiesViaPersonId: null,
      amounts: { rentCents: 95000, utilityShares: 1000, airconUnits: 1, depositCents: 95000 },
      ...overrides,
    },
    colorName: 'Green',
    swatches: [{ color: 'GREEN', name: 'Green' }],
    sentViaOptions: [],
    view: { details: [], amounts: [], routes: [] },
    secondaryAction: { label: 'Remove from household', kind: 'remove-person' },
  };
}

const BASE = { kind: 'person', personId: 'p-jordan', startsFromMonth: '2026-12' };

describe('toPersonFormValues', () => {
  it('shows no deposit as an empty field', () => {
    const form = formFor({ amounts: { rentCents: 95000, utilityShares: 1000, airconUnits: 1, depositCents: 0 } });
    expect(toPersonFormValues(form).depositCents).toBeNull();
  });

  it('passes the checks for someone with no amount fields', () => {
    const values = toPersonFormValues(formFor({ amounts: null }));
    expect(personFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('toHouseholdEdit', () => {
  const form = formFor();
  const values = toPersonFormValues(form);

  it('sends nothing but the month when nothing changed', () => {
    expect(toHouseholdEdit(values, form)).toEqual(BASE);
  });

  it('sends only what changed', () => {
    expect(toHouseholdEdit({ ...values, name: 'Jo', rentCents: 100000 }, form)).toEqual({
      ...BASE,
      name: 'Jo',
      rentCents: 100000,
    });
  });

  it.each(['', '+65'])('saves WhatsApp %j as no number', (whatsapp) => {
    expect(toHouseholdEdit({ ...values, whatsapp }, form)).toEqual({ ...BASE, whatsappE164: null });
  });

  it('sends nothing for a bare country code when there was no number', () => {
    const none = formFor({ whatsappE164: null });
    expect(toHouseholdEdit({ ...toPersonFormValues(none), whatsapp: '+65' }, none)).toEqual(BASE);
  });

  it('saves an empty deposit as 0', () => {
    expect(toHouseholdEdit({ ...values, depositCents: null }, form)).toEqual({ ...BASE, depositCents: 0 });
  });

  it('sends a cleared day as null, for the server to judge', () => {
    expect(toHouseholdEdit({ ...values, rentDueDay: null }, form)).toEqual({ ...BASE, rentDueDay: null });
  });

  it('leaves out an empty rent, shares or units', () => {
    const emptied = { ...values, rentCents: null, utilityShares: null, airconUnits: null };
    expect(toHouseholdEdit(emptied, form)).toEqual(BASE);
  });

  it('never sends amounts for someone with none', () => {
    const primary = formFor({ amounts: null });
    const edited = { ...toPersonFormValues(primary), rentCents: 5 };
    expect(toHouseholdEdit(edited, primary)).toEqual(BASE);
  });
});

describe('hasUnsavedChanges', () => {
  const form = formFor();
  const values = toPersonFormValues(form);

  it('is false when nothing changed', () => {
    expect(hasUnsavedChanges(values, form)).toBe(false);
  });

  it('is true for a changed field', () => {
    expect(hasUnsavedChanges({ ...values, color: 'BLUE' }, form)).toBe(true);
  });

  it('is true for an emptied amount, which the edit leaves out', () => {
    expect(hasUnsavedChanges({ ...values, rentCents: null }, form)).toBe(true);
  });
});

describe('mergeTypedValues', () => {
  const december: PersonFormValues = toPersonFormValues(formFor());
  const january: PersonFormValues = { ...december, rentCents: 110000, airconUnits: 2 };

  it('reloads a field the user did not change', () => {
    expect(mergeTypedValues(december, december, january)).toEqual(january);
  });

  it('keeps what the user typed', () => {
    const typed = { ...december, rentCents: 100000 };
    expect(mergeTypedValues(typed, december, january)).toEqual({ ...january, rentCents: 100000 });
  });

  it('keeps a field the user emptied', () => {
    const emptied = { ...december, rentCents: null };
    expect(mergeTypedValues(emptied, december, january).rentCents).toBeNull();
  });
});
