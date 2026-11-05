import { FormField, SelectField } from '@/components';
import type { AppliesToFieldProps } from '../types';

/** An option's value is a string, so Everyone gets one of its own. */
const EVERYONE = 'everyone';

/** Who the template is for, with the server's note under it. Disabled on Everyone until picking a person loads their text (10.6). */
export function AppliesToField({ appliesTo, personId }: AppliesToFieldProps) {
  const options = appliesTo.options.map((option) => ({ label: option.label, value: option.personId ?? EVERYONE }));
  return (
    <FormField label="Applies to" helper={appliesTo.note} disabled>
      <SelectField
        accessibilityLabel="Applies to"
        options={options}
        value={personId ?? EVERYONE}
        onChange={() => undefined}
        disabled
      />
    </FormField>
  );
}
