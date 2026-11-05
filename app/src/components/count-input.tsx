import { type ComponentRef, forwardRef, useState } from 'react';
import { type KeyboardTypeOptions, Text } from 'react-native';

import { type BareInputProps, withFormControlledFieldOf } from '@/components/form-field/';
import { Input as NativeInput, InputField as NativeInputField } from '@/components/ui/input';
import { parseShareInput, sanitizeShareInput, sharesToInputText } from '@/lib/share-input';
import { formatDayOrdinal } from '@splithouse/shared';

/** What a count input holds: a whole number, a day of the month, or shares in thousandths. */
export type CountInputKind = 'whole' | 'day' | 'shares';

const digitsOnly = (text: string) => text.replace(/\D/g, '');
const readWhole = (text: string) => (text ? Number(text) : null);

/** How each kind is typed, read and shown. */
const KINDS: Record<
  CountInputKind,
  {
    keyboardType: KeyboardTypeOptions;
    /** The most characters that can be typed. */
    maxLength: number;
    clean: (text: string) => string;
    read: (text: string) => number | null;
    /** The text while focused. */
    editText: (value: number) => string;
    /** The text once blurred. */
    shownText: (value: number) => string;
  }
> = {
  whole: {
    keyboardType: 'number-pad',
    maxLength: 3,
    clean: digitsOnly,
    read: readWhole,
    editText: String,
    shownText: String,
  },
  day: {
    keyboardType: 'number-pad',
    maxLength: 2,
    clean: digitsOnly,
    read: readWhole,
    editText: String,
    shownText: formatDayOrdinal,
  },
  shares: {
    keyboardType: 'decimal-pad',
    maxLength: 8,
    clean: sanitizeShareInput,
    read: parseShareInput,
    editText: sharesToInputText,
    shownText: sharesToInputText,
  },
};

/** The props only the count input has, on top of the shared input props. */
export interface CountInputOwnProps {
  /** How the value is typed and shown. */
  kind: CountInputKind;
  placeholder?: string;
  /** Shown after the value, such as `%`. */
  suffix?: string;
  /** Lines the text up on the right, for a number in a row of numbers. */
  alignRight?: boolean;
}

/**
 * Bare count input: the 48px outlined field with no label or form state. While focused it shows the
 * text being typed, so typing is never rewritten; on blur it shows the value as read (`4th`).
 */
const BareCountInput = forwardRef<
  ComponentRef<typeof NativeInputField>,
  BareInputProps<number | null> & CountInputOwnProps
>(function BareCountInput(
  { value, onChange, onBlur, accessibilityLabel, invalid, warned, disabled, kind, placeholder, suffix, alignRight },
  ref,
) {
  const { keyboardType, maxLength, clean, read, editText, shownText } = KINDS[kind];
  // The text being typed, only while focused; null means show the value as read.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <NativeInput isInvalid={invalid} isDisabled={disabled} className={warned ? 'border-2 border-warning px-[13px]' : undefined}>
      <NativeInputField
        ref={ref}
        value={draft ?? (value === null ? '' : shownText(value))}
        placeholder={placeholder}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel}
        textAlign={alignRight ? 'right' : undefined}
        className={disabled ? 'text-on-disabled' : undefined}
        style={{ fontVariant: ['tabular-nums'] }}
        onFocus={() => setDraft(value === null ? '' : editText(value))}
        onChangeText={(text) => {
          // Limited here, not with the field's maxLength, which would also cut the blurred text (`7th`).
          const cleaned = clean(text).slice(0, maxLength);
          setDraft(cleaned);
          onChange(read(cleaned));
        }}
        onBlur={() => {
          setDraft(null);
          onBlur?.();
        }}
      />
      {suffix ? <Text className="font-manrope-medium text-field text-on-surface-variant">{suffix}</Text> : null}
    </NativeInput>
  );
});

/**
 * Input for a small number on a number keyboard: a whole number, a day of the month (`4` while typing,
 * `4th` otherwise) or utility shares (`1.5` typed, `1500` held). Standalone, pass `value` (the number or
 * `null`) and `onChange`. Inside a form, pass `fieldControlProps` instead.
 *
 * @param kind - `whole`, `day` or `shares`.
 * @param placeholder - Shown while empty.
 * @param suffix - Shown after the value, such as `%`.
 * @param alignRight - Lines the text up on the right.
 * @param value - The number, or `null` when empty (standalone only).
 * @param onChange - Called with the number, or `null` while the text is empty (standalone only).
 * @param fieldControlProps - Binds the input to a form field (form-controlled only).
 */
export const CountInput = withFormControlledFieldOf<
  CountInputOwnProps,
  ComponentRef<typeof NativeInputField>,
  number | null
>(BareCountInput, null);
