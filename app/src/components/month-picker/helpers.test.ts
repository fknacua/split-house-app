import { describe, expect, it } from 'vitest';

import { monthPickerAdjacentYears, monthPickerCells, monthPickerOpeningYear } from './helpers';

describe('monthPickerCells', () => {
  it('always shows 12 months, January first', () => {
    const cells = monthPickerCells(2027, [], '');
    expect(cells.map((cell) => cell.name)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    expect(cells[0].month).toBe('2027-01');
    expect(cells[11].month).toBe('2027-12');
  });

  it('allows only the months given', () => {
    const cells = monthPickerCells(2027, ['2027-01', '2027-02', '2027-03'], '');
    expect(cells.filter((cell) => cell.allowed).map((cell) => cell.name)).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('marks the picked month only in its own year', () => {
    expect(monthPickerCells(2027, [], '2027-05').filter((cell) => cell.selected).map((cell) => cell.name)).toEqual([
      'May',
    ]);
    expect(monthPickerCells(2028, [], '2027-05').some((cell) => cell.selected)).toBe(false);
  });
});

describe('monthPickerAdjacentYears', () => {
  it('disables both arrows when only one year is allowed', () => {
    expect(monthPickerAdjacentYears(2027, ['2027-01', '2027-03'])).toEqual({ previous: null, next: null });
  });

  it('leads to the years on each side', () => {
    expect(monthPickerAdjacentYears(2027, ['2026-12', '2027-01', '2028-02'])).toEqual({ previous: 2026, next: 2028 });
  });

  it('skips a year with no allowed month', () => {
    expect(monthPickerAdjacentYears(2027, ['2027-01', '2029-03'])).toEqual({ previous: null, next: 2029 });
    expect(monthPickerAdjacentYears(2029, ['2027-01', '2029-03'])).toEqual({ previous: 2027, next: null });
  });
});

describe('monthPickerOpeningYear', () => {
  it('opens on the picked month, even one not allowed', () => {
    expect(monthPickerOpeningYear('2028-04', ['2027-01'], '2026-11')).toBe(2028);
  });

  it('opens on this year when it has an allowed month', () => {
    expect(monthPickerOpeningYear('', ['2026-12', '2027-01'], '2026-11')).toBe(2026);
  });

  it('opens on the earliest allowed year otherwise', () => {
    expect(monthPickerOpeningYear('', ['2028-01', '2027-06'], '2026-11')).toBe(2027);
  });

  it('opens on this year when nothing is allowed', () => {
    expect(monthPickerOpeningYear('', [], '2026-11')).toBe(2026);
  });
});
