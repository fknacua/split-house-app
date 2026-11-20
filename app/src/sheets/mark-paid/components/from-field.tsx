import { BareSelectField, FormField } from '@/components';
import type { FromFieldProps } from '../types';

/**
 * From: who paid, from the server's list of people who still owe, each with its detail line (in red
 * while something of theirs is overdue). The app's usual select list, as Send message's To. Picking
 * someone else clears the ticks.
 */
export function FromField({ from, value, disabled, onChange }: FromFieldProps) {
  return (
    <FormField label="From" required disabled={disabled}>
      <BareSelectField
        accessibilityLabel="From"
        placeholder={from.placeholder}
        options={from.options.map((o) => ({
          label: o.name,
          value: o.personId,
          detail: o.detail,
          detailTone: o.tone,
        }))}
        value={value ?? ''}
        disabled={disabled}
        onChange={(personId) => {
          if (personId) onChange(personId);
        }}
      />
    </FormField>
  );
}
