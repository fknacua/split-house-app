import { describe, expect, it } from 'vitest';

import { fieldOrder } from './field-order';

describe('fieldOrder', () => {
  it('points each field at the one after it', () => {
    const next = fieldOrder(['name', 'whatsapp', 'rentDueDay']);
    expect(next('name')).toBe('whatsapp');
    expect(next('whatsapp')).toBe('rentDueDay');
  });

  it('gives the last field no next', () => {
    expect(fieldOrder(['name', 'whatsapp'])('whatsapp')).toBeUndefined();
  });

  it('skips hidden fields given as falsy entries', () => {
    const hidden = false as boolean;
    const next = fieldOrder(['rentDueDay', 'utilitiesDueDay', hidden && 'utilityShares', null, undefined, 'deposit']);
    expect(next('utilitiesDueDay')).toBe('deposit');
  });

  it('gives a name not in the list no next', () => {
    expect(fieldOrder<string>(['name'])('other')).toBeUndefined();
  });

  it('works for field array paths', () => {
    const next = fieldOrder(['rent', ...[0, 1].flatMap((i) => [`rooms.${i}.name`, `rooms.${i}.rent`])]);
    expect(next('rooms.0.rent')).toBe('rooms.1.name');
  });
});
