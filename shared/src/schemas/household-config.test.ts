import { describe, expect, it } from 'vitest';

import { messageTemplatesSchema } from './household-config';

const BASE = { monthly: 'm', nudge: 'n' };

describe('messageTemplatesSchema sectionTitles', () => {
  it('reads section titles by message, then by section', () => {
    const titles = { 'person-a': { 'person-a': 'Master Bedroom Share', 'person-b': 'Room 2 Share' } };
    expect(messageTemplatesSchema.parse({ ...BASE, sectionTitles: titles }).sectionTitles).toEqual(titles);
  });

  it('keeps an older flat title for that person’s own message', () => {
    const parsed = messageTemplatesSchema.parse({ ...BASE, sectionTitles: { 'person-a': 'Master Bedroom Share' } });
    expect(parsed.sectionTitles).toEqual({ 'person-a': { 'person-a': 'Master Bedroom Share' } });
  });

  it('defaults to none and refuses a blank title', () => {
    expect(messageTemplatesSchema.parse(BASE).sectionTitles).toEqual({});
    expect(messageTemplatesSchema.safeParse({ ...BASE, sectionTitles: { a: { b: ' ' } } }).success).toBe(false);
  });
});
