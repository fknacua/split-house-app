import { describe, expect, it } from 'vitest';
import { monthKey } from './primitives';

describe('monthKey', () => {
  it('accepts YYYY-MM with a month from 01 to 12', () => {
    expect(monthKey.safeParse('2026-11').success).toBe(true);
    expect(monthKey.safeParse('2027-01').success).toBe(true);
  });

  it('rejects other shapes and months', () => {
    for (const value of ['2026-1', '26-11', '2026-13', '2026-00', '2026-11-01', '']) {
      expect(monthKey.safeParse(value).success).toBe(false);
    }
  });
});
