import { describe, expect, it } from 'vitest';

import { addMonths, currentMonth, formatMonthLabel, isMonthKey, monthKeyOf, monthRange } from './month';

describe('isMonthKey', () => {
  it.each([
    ['2026-11', true],
    ['2026-01', true],
    ['2026-12', true],
    ['2026-00', false],
    ['2026-13', false],
    ['2026-1', false],
    ['26-11', false],
    ['2026-11-01', false],
    ['', false],
  ])('%s -> %s', (value, expected) => {
    expect(isMonthKey(value)).toBe(expected);
  });
});

describe('monthKeyOf', () => {
  it('uses Singapore time, not UTC', () => {
    expect(monthKeyOf(new Date('2026-10-31T16:30:00Z'))).toBe('2026-11');
    expect(monthKeyOf(new Date('2026-10-31T15:59:00Z'))).toBe('2026-10');
  });

  it('rolls over the year', () => {
    expect(monthKeyOf(new Date('2026-12-31T16:00:00Z'))).toBe('2027-01');
  });
});

describe('currentMonth', () => {
  it('takes the instant it is given', () => {
    expect(currentMonth(new Date('2026-11-03T01:00:00Z'))).toBe('2026-11');
  });

  it('defaults to the device clock', () => {
    expect(isMonthKey(currentMonth())).toBe(true);
  });
});

describe('formatMonthLabel', () => {
  it.each([
    ['2026-11', 'November 2026'],
    ['2027-01', 'January 2027'],
    ['2026-12', 'December 2026'],
  ])('%s -> %s', (key, expected) => {
    expect(formatMonthLabel(key)).toBe(expected);
  });

  it('throws on a bad key', () => {
    expect(() => formatMonthLabel('2026-13')).toThrow(RangeError);
  });
});

describe('addMonths', () => {
  it('moves across a year end', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('moves back across a year start', () => {
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2027-01', -13)).toBe('2025-12');
  });

  it('zero is unchanged', () => {
    expect(addMonths('2026-11', 0)).toBe('2026-11');
  });

  it('throws on a bad key', () => {
    expect(() => addMonths('nope', 1)).toThrow(RangeError);
  });
});

describe('monthRange', () => {
  it('lists consecutive months', () => {
    expect(monthRange('2026-11', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('goes forward by default and when asked', () => {
    expect(monthRange('2026-11', 2, 'forward')).toEqual(['2026-11', '2026-12']);
  });

  it('goes back from the start', () => {
    expect(monthRange('2026-11', 3, 'back')).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(monthRange('2027-01', 3, 'back')).toEqual(['2027-01', '2026-12', '2026-11']);
  });

  it('is empty for a count of 0 or less, in either direction', () => {
    expect(monthRange('2026-11', 0)).toEqual([]);
    expect(monthRange('2026-11', -2, 'back')).toEqual([]);
  });

  it('throws on a bad start', () => {
    expect(() => monthRange('nope', 2)).toThrow(RangeError);
  });
});
