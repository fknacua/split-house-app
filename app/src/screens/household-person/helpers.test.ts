import { describe, expect, it } from 'vitest';

import type { HouseholdFormResponse } from '@splithouse/shared';
import {
  hasUnpickedRoute,
  hasUnsavedChanges,
  personFormSchema,
  toHouseholdEdit,
  toPersonFormValues,
} from './helpers';

function formFor(overrides: Partial<HouseholdFormResponse['values']> = {}): HouseholdFormResponse {
  return {
    personId: 'p-jordan',
    title: 'Edit Jordan',
    viewTitle: 'Jordan',
    sub: 'Own room · pays you directly',
    datedTitle: 'From December 2026',
    pendingNote: null,
    values: {
      name: 'Jordan',
      whatsappE164: '+6581234567',
      color: 'GREEN',
      rentDueDay: 1,
      utilitiesDueDay: 4,
      rentViaPersonId: null,
      utilitiesViaPersonId: null,
      amounts: { rentCents: 95000, depositCents: 95000 },
      ...overrides,
    },
    colorName: 'Green',
    swatches: [{ color: 'GREEN', name: 'Green' }],
    sentViaOptions: [],
    view: { details: [], amounts: [], routes: [] },
    secondaryAction: { label: 'Remove from household', kind: 'remove-person' },
  };
}

const BASE = { kind: 'person', personId: 'p-jordan' };

describe('toPersonFormValues', () => {
  it('shows no deposit as an empty field', () => {
    const form = formFor({ amounts: { rentCents: 95000, depositCents: 0 } });
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

  it('sends nothing but the person when nothing changed', () => {
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

  it('sends a route picked, and null for one now paid directly', () => {
    const via = formFor({ rentViaPersonId: 'p-priya' });
    expect(toHouseholdEdit({ ...toPersonFormValues(via), rentVia: null, utilitiesVia: 'p-sam' }, via)).toEqual({
      ...BASE,
      rentViaPersonId: null,
      utilitiesViaPersonId: 'p-sam',
    });
  });

  it('sends nothing for a route that is the saved one', () => {
    const via = formFor({ utilitiesViaPersonId: 'p-priya' });
    expect(toHouseholdEdit(toPersonFormValues(via), via)).toEqual(BASE);
  });

  it('leaves out a route with nobody picked', () => {
    expect(toHouseholdEdit({ ...values, rentVia: '' }, form)).toEqual(BASE);
  });

  it('leaves out an empty rent', () => {
    expect(toHouseholdEdit({ ...values, rentCents: null }, form)).toEqual(BASE);
  });

  it('never sends amounts for someone with none', () => {
    const primary = formFor({ amounts: null });
    const edited = { ...toPersonFormValues(primary), rentCents: 5 };
    expect(toHouseholdEdit(edited, primary)).toEqual(BASE);
  });
});

describe('hasUnpickedRoute', () => {
  const values = toPersonFormValues(formFor());

  it('is false for a direct route and a picked one', () => {
    expect(hasUnpickedRoute({ ...values, rentVia: null, utilitiesVia: 'p-priya' })).toBe(false);
  });

  it('is true while either route has nobody picked', () => {
    expect(hasUnpickedRoute({ ...values, utilitiesVia: '' })).toBe(true);
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

  it('is true for a changed route', () => {
    expect(hasUnsavedChanges({ ...values, rentVia: 'p-priya' }, form)).toBe(true);
  });

  it('is true for a route with nobody picked, which the edit leaves out', () => {
    expect(hasUnsavedChanges({ ...values, utilitiesVia: '' }, form)).toBe(true);
  });

  it('is true for an emptied amount, which the edit leaves out', () => {
    expect(hasUnsavedChanges({ ...values, rentCents: null }, form)).toBe(true);
  });
});
