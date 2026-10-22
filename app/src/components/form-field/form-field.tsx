import { CircleAlert } from "lucide-react-native";
import { ReactNode } from "react";
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