import type { AddChargePreview, AddChargeValues } from '@splithouse/shared';

import type { AddChargeTouched } from './types';

/** Custom's fields as the server sends them. */
type CustomFields = NonNullable<AddChargePreview['custom']>;

/** One Custom field as the server sends it. */
type CustomRow = CustomFields['rows'][number];

/** Per share's fields as the server sends them. */
type ShareFields = NonNullable<AddChargePreview['shares']>;

/** One share field as the server sends it. */
type ShareRow = ShareFields['rows'][number];

/** No field has been left yet. */
export const UNTOUCHED: AddChargeTouched = { label: false, amount: false, dueDate: false };

/**
 * A new idempotency key for one opening of the sheet: every Save and Retry from that opening sends it, so a save
 * whose response was lost is never stored twice. Unique enough for one person's taps; it is not a secret.
 *
 * @returns e.g. `m3k9x2-4f8a1c9e2b`.
 */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12).padEnd(10, '0')}`;
}

/**
 * The fields with one person's Custom amount changed. The first change takes every field's amount as the server
 * shows it (the Equal split), so the others stay as they are instead of the server re-splitting them.
 *
 * @param values The fields.
 * @param rows The Custom fields as the server sent them.
 * @param personId Whose amount changed.
 * @param amountCents The new amount, or null for an empty field.
 * @returns The new fields.
 */
export function withCustomAmount(
  values: AddChargeValues,
  rows: CustomRow[],
  personId: string,
  amountCents: number | null,
): AddChargeValues {
  const current =
    values.customAmounts.length > 0 ? values.customAmounts : rows.map((r) => ({ personId: r.personId, amountCents: r.amountCents }));
  const rest = current.filter((c) => c.personId !== personId);
  return { ...values, customAmounts: [...rest, { personId, amountCents }] };
}

/**
 * The fields with one person's share changed, for this charge only. The first change takes every field's shares as
 * the server shows them (the household's), so the others stay as they are.
 *
 * @param values The fields.
 * @param rows The share fields as the server sent them.
 * @param personId Whose share changed.
 * @param shares The new shares in thousandths, or null for an empty field.
 * @returns The new fields.
 */
export function withShare(values: AddChargeValues, rows: ShareRow[], personId: string, shares: number | null): AddChargeValues {
  const current = values.shares.length > 0 ? values.shares : rows.map((r) => ({ personId: r.personId, shares: r.shares }));
  const rest = current.filter((s) => s.personId !== personId);
  return { ...values, shares: [...rest, { personId, shares }] };
}

/**
 * Custom's fields with the typed amounts in place of the last preview's, so a field shows what was typed before the
 * next preview lands. While nothing is typed, the server's (the Equal split) stay.
 *
 * @param custom Custom's fields from the preview.
 * @param typed The typed amounts.
 * @returns The fields to show.
 */
export function withTypedCustom(custom: CustomFields, typed: AddChargeValues['customAmounts']): CustomFields {
  if (typed.length === 0) return custom;
  const byPerson = new Map(typed.map((c) => [c.personId, c.amountCents]));
  return { ...custom, rows: custom.rows.map((r) => ({ ...r, amountCents: byPerson.get(r.personId) ?? null })) };
}

/**
 * Per share's fields with the changed shares in place of the last preview's. While none is changed, the server's
 * (the household's) stay.
 *
 * @param shares Per share's fields from the preview.
 * @param typed The changed shares.
 * @returns The fields to show.
 */
export function withTypedShares(shares: ShareFields, typed: AddChargeValues['shares']): ShareFields {
  if (typed.length === 0) return shares;
  const byPerson = new Map(typed.map((s) => [s.personId, s.shares]));
  return { ...shares, rows: shares.rows.map((r) => ({ ...r, shares: byPerson.get(r.personId) ?? null })) };
}

/**
 * The field errors to show, in the app's words (`AddCharge` `errors`): each only once its field has been left empty
 * or invalid, so a fresh sheet shows none.
 *
 * @param values The fields.
 * @param touched Which fields have been left.
 * @param show Which fields the sheet shows, from the preview.
 * @returns The error text by field; a field with none is left out.
 */
export function fieldErrors(
  values: AddChargeValues,
  touched: AddChargeTouched,
  show: AddChargePreview['show'],
): Partial<Record<keyof AddChargeTouched, string>> {
  const errors: Partial<Record<keyof AddChargeTouched, string>> = {};
  if (show.label && touched.label && !values.label.trim()) errors.label = 'Add a label';
  if (touched.amount && (values.amountCents === null || values.amountCents <= 0)) errors.amount = 'Enter an amount above $0.00';
  if (touched.dueDate && values.dueDate === null) errors.dueDate = 'Pick a due date';
  return errors;
}

/**
 * Whether the fields differ from how the sheet opened, so Cancel asks before dropping them.
 *
 * @param values The fields.
 * @param opening The fields as the sheet opened.
 * @returns True once anything was entered or picked.
 */
export function isChanged(values: AddChargeValues, opening: AddChargeValues): boolean {
  return JSON.stringify(values) !== JSON.stringify(opening);
}
