import { useController, type FieldValues } from 'react-hook-form';

import type { FieldBinding, FieldControlProps } from '../types';

/**
 * Connects one react-hook-form field to a bare input. Call it only where the field is known to
 * be form-controlled; hooks cannot be called conditionally.
 *
 * @param fieldControlProps - The field's form binding.
 * @returns `binding` to spread onto the bare input, and `message`, the error text to show: the
 * `error` override if given, otherwise the form state's error.
 */
export function useFormControlledField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  disabled,
}: FieldControlProps<T>): { binding: FieldBinding; message: string | undefined } {
  const { field, fieldState } = useController({ control, name });
  const message = error ?? fieldState.error?.message;
  return {
    message,
    binding: {
      value: field.value ?? '',
      onChange: field.onChange,
      onBlur: field.onBlur,
      ref: field.ref,
      accessibilityLabel: label,
      invalid: !!message,
      disabled,
    },
  };
}
