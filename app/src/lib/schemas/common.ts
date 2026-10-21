import { z } from 'zod';

/**
 * Shared building blocks for form schemas. Each mirrors, by hand, the matching
 * rule in the backend's zod request schemas (see `backend/src/lib/`), so the
 * form and the API reject the same input. Server errors still win: map them
 * back onto fields with `setError`.
 */

/** A month key, `YYYY-MM`. Mirrors `monthKey` in `backend/src/lib/household/config.ts`. */
export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

/**
 * Money as integer cents, SGD. Can be negative (correction charges). Form
 * fields hold cents, never floats; `MoneyField` converts to and from the
 * typed text.
 */
export const cents = z.number('Enter an amount').int('Enter a valid amount');

/** Integer cents that must be above zero (a bill total, a payment). */
export const positiveCents = cents.positive('Enter an amount above $0.00');

/**
 * A phone number in E.164 form, any country, e.g. `+6591234567`. Checks the
 * format only, not that the number exists; Francis opens each chat himself,
 * so a wrong number shows up before anything is sent. `PhoneField` starts
 * with an editable `+65`.
 */
export const e164Phone = z.e164('Enter a valid phone number');

/** A non-empty label or name after trimming. */
export const requiredText = z.string().trim().min(1, 'Required');
