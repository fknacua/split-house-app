import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import { type ComponentRef, forwardRef } from 'react';
import { Pressable, View } from 'react-native';

import { type BareInputProps, withFormControlledField } from '@/components/form-field/';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { dateKeyOf, dateKeyToValue, formatDateLabel, todayKey } from '@splithouse/shared';

/** The props only the date field has, on top of the shared input props. */
export interface DateFieldOwnProps {
  /** Shown in the field while no date is picked (the value is `''`). */
  placeholder?: string;
  /** Earliest date that can be picked, as a `YYYY-MM-DD` key. */
  minDate?: string;
  /** Latest date that can be picked, as a `YYYY-MM-DD` key. */
  maxDate?: string;
  /** Shows an × button to clear a picked date. On by default; pass `false` to opt out. */
  clearable?: boolean;
}

/**
 * Bare date field: the 48px outlined field that opens Android's system date dialog, with no
 * label or form state. The value is a `YYYY-MM-DD` key (Singapore dates), or `''` when nothing
 * is picked. The dialog opens on the picked date, or on today while empty.
 */
export const BareDateField = forwardRef<
  ComponentRef<typeof View>,
  BareInputProps & DateFieldOwnProps
>(function BareDateField(
  {
    value,
    onChange,
    onBlur,
    accessibilityLabel,
    invalid,
    disabled,
    placeholder,
    minDate,
    maxDate,
    clearable = true,
  },
  ref
) {
  const open = () => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: dateKeyToValue(value === '' ? todayKey() : value),
      minimumDate: minDate ? dateKeyToValue(minDate) : undefined,
      maximumDate: maxDate ? dateKeyToValue(maxDate) : undefined,
      timeZoneName: 'Asia/Singapore',
      onValueChange: (_event, date) => onChange(dateKeyOf(date)),
      onDismiss: () => onBlur?.(),
    });
  };

  return (
    <View ref={ref}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={open}
      >
        <Input isInvalid={invalid} isDisabled={disabled}>
          {/* The text is display only, so taps fall through to the pressable that opens the dialog. */}
          <InputField
            editable={false}
            pointerEvents="none"
            placeholder={placeholder}
            value={value === '' ? '' : formatDateLabel(value)}
            className={disabled ? 'text-on-disabled' : undefined}
          />
          {clearable && value !== '' && !disabled && (
            <InputSlot
              accessibilityRole="button"
              accessibilityLabel="Clear"
              onPress={() => {
                onChange('');
                onBlur?.();
              }}
              className="-mr-1 h-11 w-11"
            >
              <InputIcon as={X} />
            </InputSlot>
          )}
          <InputIcon as={CalendarDays} className={disabled ? 'text-on-disabled' : undefined} />
        </Input>
      </Pressable>
    </View>
  );
});

/**
 * Date field that opens Android's system date dialog (screen mapping doc: DateTimePicker). It is
 * a custom field, not gluestack's DateTimePicker: the app is Android only, so the dialog is
 * opened directly and the box reuses the shared input look. Standalone, pass `value` and
 * `onChange`. Inside a form, pass `fieldControlProps` instead: the field is then bound to that
 * react-hook-form field and wrapped in the label-above form field.
 *
 * @param placeholder - Shown while nothing is picked.
 * @param minDate - Earliest pickable date, `YYYY-MM-DD`.
 * @param maxDate - Latest pickable date, `YYYY-MM-DD`.
 * @param clearable - Shows an × button to clear the date. Defaults to `true`; pass `false` to hide it.
 * @param value - The picked date as `YYYY-MM-DD`, or `''` (standalone only).
 * @param onChange - Called with the picked date key, or `''` on clear (standalone only).
 * @param fieldControlProps - Binds the field to a form field (form-controlled only).
 */
export const DateField = withFormControlledField(BareDateField);
