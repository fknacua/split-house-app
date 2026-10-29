import { describe, expect, it } from 'vitest';
import { formatBillFileMeta } from './bill';

describe('formatBillFileMeta', () => {
  it('writes pages and kilobytes', () => {
    expect(formatBillFileMeta(219_136, 2)).toBe('2 pages · 214 KB');
  });

  it('writes one page in the singular and megabytes above 1 MB', () => {
    expect(formatBillFileMeta(1_258_291, 1)).toBe('1 page · 1.2 MB');
  });

  it('leaves out the page count when it is unknown, and never shows 0 KB', () => {
    expect(formatBillFileMeta(300, null)).toBe('1 KB');
  });
});
