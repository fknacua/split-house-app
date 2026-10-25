import { z } from 'zod';
import { isDateKey } from '../lib/date';

/**
 * Building blocks for request, response and form schemas, used by both the
 * backend and the app so the API and the forms reject the same input.
 */

/** A month key, `YYYY-MM`. */
export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

/** A calendar date key, `YYYY-MM-DD`, in Singapore. */
export const dateKey = z.string().refine(isDateKey, 'Use YYYY-MM-DD');

/**
 * Money as integer cents, SGD. Can be negative (correction charges). Form
 * fields hold cents, never floats; `MoneyInput` converts to and from the
 * typed text.
 */
export const cents = z.number('Enter an amount').int('Enter a valid amount');

/** Integer cents that must be above zero (a bill total, a payment). */
export const positiveCents = cents.positive('Enter an amount above $0.00');

/**
 * A phone number in E.164 form, any country, e.g. `+6591234567`. Checks the
 * format only, not that the number exists; Francis opens each chat himself,
 * so a wrong number shows up before anything is sent. `PhoneInput` starts
 * with an editable `+65`.
 */
export const e164Phone = z.e164('Enter a valid phone number');

/** A non-empty label or name after trimming. */
export const requiredText = z.string().trim().min(1, 'Required');
