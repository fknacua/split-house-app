import type { FieldValues } from 'react-hook-form';

import { FormField } from './form-field';
import type { RenderPropFieldControlProps } from './types';
import { useFormControlledField } from './hooks/use-form-controlled-field';

/**
 * Render-prop form binding, for inputs that do not take `fieldControlProps` themselves. Binds one
 * react-hook-form field and wraps the input in the label-above `FormField`. The child is a render
 * function that receives the field binding to spread onto a bare input.
 *
 * @param children - Renders the bare input, for example `{(bind) => <TextInput {...bind} />}`.
 */
export function FieldControl<T extends FieldValues>({
  children,
  ...fieldControlProps
}: RenderPropFieldControlProps<T>) {
  const { binding, message } = useFormControlledField(fieldControlProps);
  const { label, required, helper, disabled, className } = fieldControlProps;
  return (
    <FormField
      label={label}
      required={required}
      helper={helper}
      error={message}
      disabled={disabled}
      className={className}
    >
      {children(binding)}
    </FormField>
  );
}
