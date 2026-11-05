import { describe, expect, it } from 'vitest';

import type { HouseholdAddFormResponse, HouseholdFormResponse } from '@splithouse/shared';
import {
  addPersonFormSchema,
  hasAddPersonInput,
  hasUnpickedRoute,
  hasUnsavedChanges,
  personFormSchema,
  toAddPersonEdit,
  toAddPersonFormValues,
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
    removeDialog: null,
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

describe('Add subtenant', () => {
  const form: HouseholdAddFormResponse = {
    title: 'Add subtenant',
    sub: 'New person in the household',
    datedTitle: 'From December 2026',
    color: 'PURPLE',
    colorName: 'Purple',
    swatches: [{ color: 'PURPLE', name: 'Purple' }],
    sentViaOptions: [],
    rooms: [],
  };
  const opened = toAddPersonFormValues(form);

  it('opens empty, on the default color', () => {
    expect(opened).toMatchObject({ name: '', whatsapp: '', color: 'PURPLE', roomId: '', rentVia: null });
  });

  it('needs the room and shares', () => {
    expect(addPersonFormSchema.safeParse(opened).success).toBe(false);
    const filled = { ...opened, roomId: 'room-4', utilityShares: 1000 };
    expect(addPersonFormSchema.safeParse(filled).success).toBe(true);
    expect(addPersonFormSchema.safeParse({ ...filled, roomId: '' }).success).toBe(false);
    expect(addPersonFormSchema.safeParse({ ...filled, utilityShares: null }).success).toBe(false);
  });

  it('sends the picked room, and no room until one is picked', () => {
    expect(toAddPersonEdit({ ...opened, roomId: 'room-4' }).roomId).toBe('room-4');
    expect(toAddPersonEdit(opened).roomId).toBeNull();
  });

  it('sends an empty deposit as 0, a lone country code as no number and an unpicked route as direct', () => {
    expect(toAddPersonEdit({ ...opened, whatsapp: '+65', rentVia: '' })).toMatchObject({
      kind: 'addPerson',
      whatsappE164: null,
      depositCents: 0,
      rentViaPersonId: null,
    });
  });

  it('is not dirty when opened, or with only the country code', () => {
    expect(hasAddPersonInput(opened, form)).toBe(false);
    expect(hasAddPersonInput({ ...opened, whatsapp: '+65' }, form)).toBe(false);
  });

  it('is dirty once anything is entered', () => {
    expect(hasAddPersonInput({ ...opened, name: 'C' }, form)).toBe(true);
    expect(hasAddPersonInput({ ...opened, roomId: 'room-4' }, form)).toBe(true);
    expect(hasAddPersonInput({ ...opened, color: 'BLUE' }, form)).toBe(true);
    expect(hasAddPersonInput({ ...opened, rentVia: '' }, form)).toBe(true);
    expect(hasAddPersonInput({ ...opened, whatsapp: '+6581234567' }, form)).toBe(true);
  });
});
