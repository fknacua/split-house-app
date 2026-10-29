import { type ComponentRef, forwardRef, useState } from 'react';
import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { type BareInputProps, withFormControlledFieldOf } from '@/components/form-field/';
import {
  Input as NativeInput,
  InputField as NativeInputField,
  InputIcon as NativeInputIcon,
  InputSlot as NativeInputSlot,
} from '@/components/ui/input';
import { formatCents } from '@splithouse/shared';
import { centsToInputText, parseMoneyToCents, sanitizeMoneyInput } from '@/lib/money-input';

/** The props only the money input has, on top of the shared input props. */
export interface MoneyInputOwnProps {
  placeholder?: string;
  /** Shows a +/- button, since the numeric keyboard has no minus key. For corrections. */
  allowNegative?: boolean;
  /** Shows an × button that empties the field. Off by default. */
  clearable?: boolean;
}

/**
 * Bare money input: the 48px outlined field with no label or form state. The value is integer
 * cents, or `null` while the field is empty or the text is not yet an amount. While focused it
 * shows the text being typed (`1862.`), so typing is never rewritten; on blur it shows the
 * formatted amount (`$1,862.86`).
 */
const BareMoneyInput = forwardRef<
  ComponentRef<typeof NativeInputField>,
  BareInputProps<number | null> & MoneyInputOwnProps
>(function BareMoneyInput(
  {
    value,
    onChange,
    onBlur,
    accessibilityLabel,
    invalid,
    disabled,
    placeholder = '$0.00',
    allowNegative,
    clearable = false,
  },
  ref
) {
  // The text being typed, only while focused; null means show the formatted value.
  const [draft, setDraft] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    const clean = sanitizeMoneyInput(text, allowNegative);
    setDraft(clean);
    onChange(parseMoneyToCents(clean));
  };

  const handleToggleSign = () => {
    if (draft !== null) {
      const next = draft.startsWith('-') ? draft.slice(1) : `-${draft}`;
      setDraft(next);
      onChange(parseMoneyToCents(next));
    } else if (value) {
      onChange(-value);
    }
  };

  const handleClear = () => {
    onChange(null);
    if (draft !== null) {
      setDraft('');
    } else {
      // Not focused: count it as touched, so an empty required field shows its error.
      onBlur?.();
    }
  };

  const shown = draft ?? (value === null ? '' : formatCents(value));

  return (
    <View className="flex-row items-center gap-2">
      <NativeInput isInvalid={invalid} isDisabled={disabled} className="flex-1">
        <NativeInputField
          ref={ref}
          value={shown}
          placeholder={placeholder}
          keyboardType="decimal-pad"
          accessibilityLabel={accessibilityLabel}
          className={disabled ? 'text-on-disabled' : undefined}
          style={{ fontVariant: ['tabular-nums'] }}
          onFocus={() => setDraft(value === null ? '' : centsToInputText(value))}
          onChangeText={handleChangeText}
          onBlur={() => {
            setDraft(null);
            onBlur?.();
          }}
        />
        {clearable && shown !== '' && !disabled ? (
          <NativeInputSlot
            accessibilityRole="button"
            accessibilityLabel="Clear"
            onPress={handleClear}
            className="-mr-1 h-11 w-11"
          >
            <NativeInputIcon as={X} />
          </NativeInputSlot>
        ) : null}
      </NativeInput>
      {allowNegative ? (
        <Button label="+/-" variant="outline" size="small" disabled={disabled} onPress={handleToggleSign} />
      ) : null}
    </View>
  );
});

/**
 * Money input: types dollars and cents, holds integer cents. Standalone, pass `value` (cents or
 * `null`) and `onChange`. Inside a form, pass `fieldControlProps` instead, and validate with
 * `cents` or `positiveCents` from `@splithouse/shared`. Money formatting and parsing live in
 * `lib/money`.
 *
 * @param value - Amount in integer cents, or `null` when empty (standalone only).
 * @param onChange - Called with the cents, or `null` while the text is not an amount (standalone only).
 * @param fieldControlProps - Binds the input to a form field (form-controlled only).
 * @param placeholder - Shown while empty. Defaults to `$0.00`.
 * @param allowNegative - Shows a +/- button for negative amounts, like correction charges.
 * @param clearable - Shows an × button that empties the field. Defaults to `false`.
 */
export const MoneyInput = withFormControlledFieldOf<
  MoneyInputOwnProps,
  ComponentRef<typeof NativeInputField>,
  number | null
>(BareMoneyInput, null);
