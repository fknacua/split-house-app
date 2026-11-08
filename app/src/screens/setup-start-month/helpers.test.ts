import { describe, expect, it } from 'vitest';
import type { SetupStartMonthOption } from '@splithouse/shared';

import { farAheadNote, startMonthFor } from './helpers';

const options: SetupStartMonthOption[] = [
  { id: 'this', kicker: 'This month', month: '2026-11', title: 'November 2026', note: null },
  { id: 'next', kicker: 'Next month', month: '2026-12', title: 'December 2026', note: null },
  { id: 'other', kicker: 'Another month', month: null, title: 'Choose from the calendar', note: null },
];

describe('startMonthFor', () => {
  it('sends the month of a radio card', () => {
    expect(startMonthFor(options, 'this', null)).toBe('2026-11');
    expect(startMonthFor(options, 'next', '2027-03')).toBe('2026-12');
  });

  it('sends the picked month for Another month', () => {
    expect(startMonthFor(options, 'other', '2027-03')).toBe('2027-03');
    expect(startMonthFor(options, 'other', null)).toBeNull();
  });
});

describe('farAheadNote', () => {
  it('names the picked month', () => {
    expect(farAheadNote('2027-01')).toBe('That’s a long wait. Are you sure you want to start in January 2027?');
  });
});
