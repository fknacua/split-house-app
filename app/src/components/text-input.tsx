import { type ComponentRef, forwardRef } from 'react';
import type { KeyboardTypeOptions, TextInputProps as ReactTextInputProps } from 'react-native';

import { Input as NativeInput, InputField as NativeInputField } from '@/components/ui/input';
import { withFormControlledField, BareInputProps } from './form-field/';

/** The props only the single-line input has, on top of the shared input props. */
export interface TextInputOwnProps {
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: ReactTextInputProps['autoCapitalize'];
  maxLength?: number;
}

/** Bare single-line input: the 48px outlined field with no label or form state. */
const BareTextInput = forwardRef<
  ComponentRef<typeof NativeInputField>,
  BareInputProps & TextInputOwnProps
>(function BareTextInput(
  {
    value,
    onChange,
    onBlur,
    accessibilityLabel,
    invalid,
    disabled,
    placeholder,
    keyboardType,
    autoCapitalize,
    maxLength,
  },
  ref
) {
  return (
    <NativeInput isInvalid={invalid} isDisabled={disabled}>
      <NativeInputField
        ref={ref}
        value={value}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
        className={disabled ? 'text-on-disabled' : undefined}
        onChangeText={onChange}
        onBlur={onBlur}
      />
    </NativeInput>
  );
});

/**
 * Single-line text input (screen mapping doc: Input). Standalone, pass `value` and `onChange`.
 * Inside a form, pass `fieldControlProps` instead: the input is then bound to that react-hook-form
 * field and wrapped in the label-above form field. The look lives in `ui/input`.
 *
 * @param value - Current text (standalone only).
 * @param onChange - Called with the new text (standalone only).
 * @param fieldControlProps - Binds the input to a form field (form-controlled only).
 */
export const TextInput = withFormControlledField(BareTextInput);
