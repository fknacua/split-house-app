import { type ComponentRef, forwardRef } from 'react';

import { formatMonthLabel } from '@splithouse/shared';
import { withFormControlledField, BareInputProps } from './form-field/';
import { BareSelectField } from './select-field';

/** The props only the month select has, on top of the shared input props. */
export interface MonthSelectFieldOwnProps {
  /** The months that can be picked, as `YYYY-MM` keys, in the order they are listed. */
  months: string[];
  /** Shown in the field while no month is picked (the value is `''`). */
  placeholder?: string;
  /** Shows an × button to clear a picked month. Off by default; pass `true` to opt in. */
  clearable?: boolean;
}

/** Bare month select: a select whose choices are month keys shown as "November 2026". */
const BareMonthSelectField = forwardRef<
  ComponentRef<typeof BareSelectField>,
  BareInputProps & MonthSelectFieldOwnProps
>(function BareMonthSelectField({ months, ...rest }, ref) {
  const options = months.map((month) => ({ label: formatMonthLabel(month), value: month }));
  return <BareSelectField ref={ref} options={options} {...rest} />;
});

/**
 * Month list choice (Bill month, Starts from, Month being fixed). Gluestack has no month-only
 * picker, so this is a select over month keys. The value is a `YYYY-MM` key, or `''` when nothing
 * is picked. Standalone, pass `value` and `onChange`; inside a form, pass `fieldControlProps`.
 *
 * @param months - The month keys that can be picked.
 * @param placeholder - Shown while nothing is picked.
 * @param clearable - Shows an × button to clear the month. Defaults to `false`; pass `true` to show it.
 * @param value - The picked month key, or `''` (standalone only).
 * @param onChange - Called with the picked month key (standalone only).
 * @param fieldControlProps - Binds the select to a form field (form-controlled only).
 */
export const MonthSelectField = withFormControlledField(BareMonthSelectField);
