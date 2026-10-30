import { BareSelectField, FormField } from '@/components';
import { toForOptions, toFromOptions } from '../helpers';
import type { PaymentPickersProps } from '../types';

/**
 * Record payment's From and For fields, above the summary. Choosing a person shows their first
 * charge; choosing a charge swaps the sheet's text to it. Both stay disabled while loading or saving.
 */
export function PaymentPickers({ options, choice, disabled, onPick }: PaymentPickersProps) {
  const off = disabled || choice === null;
  return (
    <>
      <FormField label="From" required disabled={off}>
        <BareSelectField
          accessibilityLabel="From"
          options={toFromOptions(options)}
          value={choice?.person.personId ?? ''}
          onChange={(personId) => onPick({ personId })}
          disabled={off}
        />
      </FormField>
      <FormField label="For" required disabled={off}>
        <BareSelectField
          accessibilityLabel="For"
          options={toForOptions(choice?.person ?? null)}
          value={choice?.charge.sheet.chargeId ?? ''}
          onChange={(chargeId) => onPick({ personId: choice?.person.personId, chargeId })}
          disabled={off}
        />
      </FormField>
    </>
  );
}
