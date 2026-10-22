import { type ComponentRef, forwardRef } from 'react';
import type { TextInputProps as ReactTextInputProps } from 'react-native';

import { withFormControlledField, BareInputProps } from '@/components/form-field/';
import {
  Textarea as NativeTextarea,
  TextareaInput as NativeTextareaInput,
} from '@/components/ui/textarea';

/** Height of one line of field text (16/24), in px. */
const LINE_HEIGHT = 24;
/** Top and bottom padding of the field (12px each), in px. */
const VERTICAL_PADDING = 24;

/** The props only the multi-line input has, on top of the shared input props. */
export interface TextareaInputOwnProps {
  placeholder?: string;
  autoCapitalize?: ReactTextInputProps['autoCapitalize'];
  maxLength?: number;
  /** Lines tall when empty. Defaults to 3, the 96px design height. */
  lines?: number;
  /** Lines it grows to before it stops and scrolls inside. Defaults to 6. */
  maxLines?: number;
}

/** Bare multi-line input: the outlined field with no label or form state. */
const BareTextareaInput = forwardRef<
  ComponentRef<typeof NativeTextareaInput>,
  BareInputProps & TextareaInputOwnProps
>(function BareTextareaInput(
  {
    value,
    onChange,
    onBlur,
    accessibilityLabel,
    invalid,
    disabled,
    placeholder,
    autoCapitalize,
    maxLength,
    lines = 3,
    maxLines = 6,
  },
  ref
) {
  return (
    <NativeTextarea
      isInvalid={invalid}
      isDisabled={disabled}
      style={{
        minHeight: lines * LINE_HEIGHT + VERTICAL_PADDING,
        maxHeight: Math.max(lines, maxLines) * LINE_HEIGHT + VERTICAL_PADDING,
      }}
    >
      <NativeTextareaInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline
        accessibilityLabel={accessibilityLabel}
        className={disabled ? 'text-on-disabled' : undefined}
      />
    </NativeTextarea>
  );
});

/**
 * Multi-line text input (screen mapping doc: Textarea). Standalone, pass `value` and `onChange`.
 * Inside a form, pass `fieldControlProps` instead: the input is then bound to that react-hook-form
 * field and wrapped in the label-above form field. The look lives in `ui/textarea`.
 *
 * @param value - Current text (standalone only).
 * @param onChange - Called with the new text (standalone only).
 * @param fieldControlProps - Binds the input to a form field (form-controlled only).
 * @param lines - Lines tall when empty. Defaults to 3.
 * @param maxLines - Lines it grows to before it scrolls inside. Defaults to 6; use a lower number
 * in bottom sheets and a higher one for long text on a full page.
 */
export const TextareaInput = withFormControlledField(BareTextareaInput);
