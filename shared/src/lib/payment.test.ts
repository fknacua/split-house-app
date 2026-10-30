import { describe, expect, it } from 'vitest';

import { formatPaymentDifference } from './payment';

describe('formatPaymentDifference', () => {
  it('has nothing to say when the amounts match', () => {
    expect(formatPaymentDifference(196365, 196365, '2026-11')).toBeNull();
  });

  it('words a short payment with the charge month', () => {
    expect(formatPaymentDifference(196365, 190000, '2026-11')).toEqual({
      kind: 'short',
      title: '$63.65 short of $1,963.65',
      text: 'November stays $63.65 short until you edit the payment or add a correction.',
    });
  });

  it('names the charge month for a late payment', () => {
    expect(formatPaymentDifference(95000, 90000, '2026-10')?.text).toBe(
      'October stays $50.00 short until you edit the payment or add a correction.'
    );
  });

  it('words an overpayment', () => {
    expect(formatPaymentDifference(196365, 198365, '2026-11')).toEqual({
      kind: 'over',
      title: '$20.00 over $1,963.65',
      text: 'The extra is recorded as received. Add a correction if it should count elsewhere.',
    });
  });

  it('throws on an amount that is not integer cents', () => {
    expect(() => formatPaymentDifference(95000, 900.5, '2026-11')).toThrow(RangeError);
  });
});
