import { type ComponentRef, forwardRef } from 'react';

import { withFormControlledField, BareInputProps } from '@/components/form-field/';
import { Input as NativeInput, InputField as NativeInputField } from '@/components/ui/input';

/** Country code the input shows while it is empty. */
const DEFAULT_COUNTRY_CODE = '+65';

/** Keeps a leading `+` and digits only, so pasted spaces and dashes never reach the form. */
function cleanPhone(text: string): string {
  const digits = text.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/** The props only the phone input has, on top of the shared input props. */
export interface PhoneInputOwnProps {
  placeholder?: string;
}

/** Bare phone input: the 48px outlined field with no label or form state. */
const BarePhoneInput = forwardRef<
  ComponentRef<typeof NativeInputField>,
  BareInputProps & PhoneInputOwnProps
>(function BarePhoneInput(
  { value, onChange, onBlur, accessibilityLabel, invalid, disabled, placeholder },
  ref
) {
  return (
    <NativeInput isInvalid={invalid} isDisabled={disabled}>
      <NativeInputField
        ref={ref}
        value={value || DEFAULT_COUNTRY_CODE}
        placeholder={placeholder}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={16}
        accessibilityLabel={accessibilityLabel}
        className={disabled ? 'text-on-disabled' : undefined}
        onChangeText={(text) => onChange(cleanPhone(text))}
        onBlur={onBlur}
      />
    </NativeInput>
  );
});

/**
 * WhatsApp number input: shows an editable `+65` while empty so other countries work (edit the
 * code or type over it). The value is `+` and digits, for example `+6591234567`; check it with
 * `e164Phone` from `lib/schemas/common`. Standalone, pass `value` and `onChange`; inside a form,
 * pass `fieldControlProps` instead.
 *
 * @param value - Current number, or an empty string (standalone only).
 * @param onChange - Called with the cleaned number (standalone only).
 * @param fieldControlProps - Binds the input to a form field (form-controlled only).
 */
export const PhoneInput = withFormControlledField(BarePhoneInput);
