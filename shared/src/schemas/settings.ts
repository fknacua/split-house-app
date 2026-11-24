import { z } from 'zod';

/** The five notification toggles, in the order Settings and First run's Reminders page list them. */
export const NOTIFICATION_TOGGLES = ['uploadBill', 'collectRent', 'payBill', 'paymentChecks', 'fyi'] as const;

/** One notification toggle. */
export const notificationToggle = z.enum(NOTIFICATION_TOGGLES);

/** One notification toggle. */
export type NotificationToggle = z.infer<typeof notificationToggle>;

/** Whether each notification is on: every toggle is on by default except FYI updates. */
export const DEFAULT_NOTIFICATION_TOGGLES: Readonly<Record<NotificationToggle, boolean>> = {
  uploadBill: true,
  collectRent: true,
  payBill: true,
  paymentChecks: true,
  fyi: false,
};

/**
 * `Settings.notifications`: one boolean per toggle. A missing or malformed toggle takes its default, and keys it
 * doesn't know (such as an old `savings`) are dropped, so an older row always reads.
 */
export const notificationTogglesSchema = z.object({
  uploadBill: z.boolean().catch(DEFAULT_NOTIFICATION_TOGGLES.uploadBill),
  collectRent: z.boolean().catch(DEFAULT_NOTIFICATION_TOGGLES.collectRent),
  payBill: z.boolean().catch(DEFAULT_NOTIFICATION_TOGGLES.payBill),
  paymentChecks: z.boolean().catch(DEFAULT_NOTIFICATION_TOGGLES.paymentChecks),
  fyi: z.boolean().catch(DEFAULT_NOTIFICATION_TOGGLES.fyi),
});

/** Whether each notification is on. */
export type NotificationToggles = z.infer<typeof notificationTogglesSchema>;

/**
 * Reads the stored toggles.
 *
 * @param value - `Settings.notifications` as stored, or null when there is no row yet.
 * @returns Every toggle, each from the stored value when it is a boolean and from its default otherwise.
 */
export function parseNotificationToggles(value: unknown): NotificationToggles {
  const stored = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
  return notificationTogglesSchema.parse(stored);
}
