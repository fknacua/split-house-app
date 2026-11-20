import { BareSelectField, FormField } from '@/components';
import type { ToFieldProps } from '../types';

/**
 * To: who the message goes to, from the server's list, each with its detail line (in red for what is
 * overdue in nudge mode). The app's usual select list, with no Cancel of its own (deviation V30).
 */
export function ToField({ to, value, onChange }: ToFieldProps) {
  return (
    <FormField label="To" required>
      <BareSelectField
        accessibilityLabel="To"
        placeholder={to.placeholder}
        options={to.options.map((o) => ({
          label: o.name,
          value: o.personId,
          detail: o.detail,
          detailTone: o.tone,
        }))}
        value={value ?? ''}
        onChange={(personId) => {
          if (personId) onChange(personId);
        }}
      />
    </FormField>
  );
}
