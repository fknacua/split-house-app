import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_TOGGLES, parseNotificationToggles } from './settings';

describe('parseNotificationToggles', () => {
  it('gives the defaults with no row yet: everything on but FYI', () => {
    expect(parseNotificationToggles(null)).toEqual({
      uploadBill: true,
      collectRent: true,
      payBill: true,
      paymentChecks: true,
      fyi: false,
    });
  });

  it('keeps stored toggles and fills a missing one with its default', () => {
    expect(parseNotificationToggles({ uploadBill: false, fyi: true })).toEqual({
      ...DEFAULT_NOTIFICATION_TOGGLES,
      uploadBill: false,
      fyi: true,
    });
  });

  it('drops keys it does not know, such as an old savings toggle', () => {
    expect(parseNotificationToggles({ savings: true, collectRent: false })).toEqual({
      ...DEFAULT_NOTIFICATION_TOGGLES,
      collectRent: false,
    });
  });

  it('reads a malformed toggle or row as the defaults instead of failing', () => {
    expect(parseNotificationToggles({ payBill: 'yes' })).toEqual(DEFAULT_NOTIFICATION_TOGGLES);
    expect(parseNotificationToggles([true])).toEqual(DEFAULT_NOTIFICATION_TOGGLES);
    expect(parseNotificationToggles('on')).toEqual(DEFAULT_NOTIFICATION_TOGGLES);
  });
});
