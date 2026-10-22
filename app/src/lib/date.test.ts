import { describe, expect, it } from 'vitest';

import { dateKeyOf, dateKeyToValue, formatDateLabel, isDateKey, todayKey } from './date';

describe('isDateKey', () => {
  it.each([
    ['2026-11-02', true],
    ['2026-02-28', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-11-00', false],
    ['2026-11-31', false],
    ['2026-1-5', false],
    ['2026-11', false],
    ['', false],
  ])('%s -> %s', (value, expected) => {
    expect(isDateKey(value)).toBe(expected);
  });
});

describe('dateKeyOf and todayKey', () => {
  it('uses Singapore time, not UTC', () => {
    expect(dateKeyOf(new Date('2026-10-31T16:30:00Z'))).toBe('2026-11-01');
    expect(dateKeyOf(new Date('2026-10-31T15:59:00Z'))).toBe('2026-10-31');
  });

  it('todayKey takes the given time', () => {
    expect(todayKey(new Date('2026-11-01T17:00:00Z'))).toBe('2026-11-02');
  });
});

describe('dateKeyToValue', () => {
  it('is midnight Singapore time, so it round-trips', () => {
    expect(dateKeyToValue('2026-11-02').getTime()).toBe(Date.parse('2026-11-01T16:00:00Z'));
    expect(dateKeyOf(dateKeyToValue('2026-11-02'))).toBe('2026-11-02');
  });

  it('throws on a bad key', () => {
    expect(() => dateKeyToValue('2026-02-30')).toThrow(RangeError);
  });
});

describe('formatDateLabel', () => {
  it('formats like the design', () => {
    expect(formatDateLabel('2026-11-02')).toBe('Mon, 2 Nov 2026');
    expect(formatDateLabel('2026-12-25')).toBe('Fri, 25 Dec 2026');
  });
});
