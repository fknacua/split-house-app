import { CircleAlert, TriangleAlert } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View } from "react-native";
import { Icon } from '@/components/icon';
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
 * @param labelAction - Optional link at the end of the label row, such as `Restore to original`.
 * @param helper - Hint text under the control. Replaced by `error` while there is one.
 * @param error - Error text under the control, with the alert icon. Also turns the control invalid.
 * @param warning - Amber text under the control, with the warning icon. Replaced by `error`, and replaces `helper`.
 * @param disabled - Dims the label and disables the control.
 * @param children - The control itself, such as an input.
 * @param className - Extra classes for the outer wrapper.
 */
export function FormField({
  label,
  required,
  labelAction,
  helper,
  error,
  warning,
  disabled,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  labelAction?: ReactNode;
  helper?: string;
  error?: string;
  warning?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FormControl isInvalid={!!error} isDisabled={disabled} className={className}>
      <FormControlLabel className={labelAction ? 'justify-between gap-2' : undefined}>
        <View className="flex-row items-center">
          <FormControlLabelText className={disabled ? 'text-on-disabled' : undefined}>
            {label}
          </FormControlLabelText>
          {required ? (
            <FormControlLabelAstrick accessibilityElementsHidden importantForAccessibility="no">
              {' *'}
            </FormControlLabelAstrick>
          ) : null}
        </View>
        {labelAction}
      </FormControlLabel>
      {children}
      {error ? (
        <FormControlError>
          <FormControlErrorIcon as={CircleAlert} />
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      ) : warning ? (
        <View className="mt-1.5 flex-row items-center gap-1">
          <Icon as={TriangleAlert} size={14} className="text-warning" />
          <Text className="font-manrope-semibold text-caption text-warning">{warning}</Text>
        </View>
      ) : helper ? (
        <FormControlHelper>
          <FormControlHelperText>{helper}</FormControlHelperText>
        </FormControlHelper>
      ) : null}
    </FormControl>
  );
}
