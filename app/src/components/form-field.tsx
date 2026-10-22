import { CircleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelAstrick,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';

/**
 * The label-above layout shared by every field (screen mapping doc: FormControl): bold label with
 * an optional required marker, the control, then helper or error text. A thin wrapper over the
 * native gluestack form control in `ui/form-control`, which holds the type, colours and spacing.
 *
 * @param label - The label shown above the control.
 * @param required - Shows the red required marker after the label.
 * @param helper - Hint text under the control. Replaced by `error` while there is one.
 * @param error - Error text under the control, with the alert icon. Also turns the control invalid.
 * @param disabled - Dims the label and disables the control.
 * @param children - The control itself, such as an input.
 * @param className - Extra classes for the outer wrapper.
 */
export function FormField({
  label,
  required,
  helper,
  error,
  disabled,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FormControl isInvalid={!!error} isDisabled={disabled} className={className}>
      <FormControlLabel>
        <FormControlLabelText className={disabled ? 'text-on-disabled' : undefined}>
          {label}
        </FormControlLabelText>
        {required ? (
          <FormControlLabelAstrick accessibilityElementsHidden importantForAccessibility="no">
            {' *'}
          </FormControlLabelAstrick>
        ) : null}
      </FormControlLabel>
      {children}
      {error ? (
        <FormControlError>
          <FormControlErrorIcon as={CircleAlert} />
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      ) : helper ? (
        <FormControlHelper>
          <FormControlHelperText>{helper}</FormControlHelperText>
        </FormControlHelper>
      ) : null}
    </FormControl>
  );
}

/** Props every form-bound field shares: the form state it reads and the text around the control. */
export interface FormFieldProps<T extends FieldValues> {
  /** The react-hook-form `control` that owns this field. */
  control: Control<T>;
  /** The field's name in the form values. The value must be a string. */
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  helper?: string;
  /** Overrides the form state's error, for a server error that is not on the field yet. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Single-line text field (screen mapping doc: Input) bound to react-hook-form. The label, helper
 * and error text come from the form state; the 48px outlined look lives in `ui/input`.
 *
 * @param placeholder - Hint shown while the field is empty.
 * @param keyboardType - Keyboard to open. Defaults to the normal text keyboard.
 * @param autoCapitalize - Capitalisation. Defaults to sentences.
 * @param maxLength - Longest value the field accepts.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  helper,
  error,
  disabled,
  className,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
}: FormFieldProps<T> & {
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  maxLength?: number;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = error ?? fieldState.error?.message;
        return (
          <FormField
            label={label}
            required={required}
            helper={helper}
            error={message}
            disabled={disabled}
            className={className}
          >
            <Input isInvalid={!!message} isDisabled={disabled}>
              <InputField
                ref={field.ref}
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                maxLength={maxLength}
                accessibilityLabel={label}
                className={disabled ? 'text-on-disabled' : undefined}
              />
            </Input>
          </FormField>
        );
      }}
    />
  );
}
