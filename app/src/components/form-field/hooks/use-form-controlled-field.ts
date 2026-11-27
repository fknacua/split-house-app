import { useCallback, useEffect } from 'react';
import { useController, useFormContext, type FieldValues } from 'react-hook-form';

import type { FieldBinding, FieldControlProps } from '../types';

/**
 * Connects one react-hook-form field to a bare input. Call it only where the field is known to
 * be form-controlled; hooks cannot be called conditionally.
 *
 * @param fieldControlProps - The field's form binding.
 * @param emptyValue - What the bare input gets while the field has no value. Defaults to an empty
 * string, so only inputs whose value is not a string need to pass it (for example `null`).
 * @returns `binding` to spread onto the bare input, and `message`, the error text to show: the
 * `error` override if given, otherwise the form state's error. `binding.onNext` is set when the
 * field has a `next` and the form is inside a `FormProvider`.
 */
export function useFormControlledField<T extends FieldValues, V = string>(
  { control, name, label, error, warning, disabled, next }: FieldControlProps<T>,
  emptyValue: V = '' as V
): { binding: FieldBinding<V>; message: string | undefined } {
  const { field, fieldState } = useController({ control, name });
  // Null outside a FormProvider; `setFocus` only comes from useForm, not from `control`.
  const methods = useFormContext<T>() as ReturnType<typeof useFormContext<T>> | null;
  const setFocus = methods?.setFocus;
  const onNext = useCallback(() => {
    if (next) setFocus?.(next);
  }, [next, setFocus]);

  useEffect(() => {
    if (__DEV__ && next && !setFocus) {
      console.warn(`Field "${name}" has next "${next}" but its form is not inside a FormProvider.`);
    }
  }, [name, next, setFocus]);

  const message = error ?? fieldState.error?.message;
  return {
    message,
    binding: {
      value: field.value ?? emptyValue,
      onChange: field.onChange,
      onBlur: field.onBlur,
      ref: field.ref,
      accessibilityLabel: label,
      invalid: !!message,
      warned: !message && !!warning,
      disabled,
      onNext: next && setFocus ? onNext : undefined,
    },
  };
}
