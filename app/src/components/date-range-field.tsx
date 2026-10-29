import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import { type ComponentRef, forwardRef } from 'react';
import { Pressable, View } from 'react-native';

import { type BareInputProps, withFormControlledFieldOf } from '@/components/form-field/';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { dateKeyOf, dateKeyToValue, formatDateRange, todayKey } from '@splithouse/shared';

/** A span of days as `YYYY-MM-DD` keys. Both are `''` while no span is picked. */
export interface DateRange {
  start: string;
  end: string;
}

/** The empty range, the field's value while nothing is picked. */
export const EMPTY_DATE_RANGE: DateRange = { start: '', end: '' };

/** The props only the date range field has, on top of the shared input props. */
export interface DateRangeFieldOwnProps {
  /** Shown in the field while no span is picked. */
  placeholder?: string;
  /** Shows an × button to clear a picked span. On by default (like `DateField`); pass `false` to opt out. */
  clearable?: boolean;
}

/**
 * Bare date range field: the 48px outlined field that opens Android's system date dialog twice,
 * first for the start day, then for the end day (which cannot be before the start). The span is
 * only changed once both are picked; dismissing either dialog keeps the old one.
 */
const BareDateRangeField = forwardRef<
  ComponentRef<typeof View>,
  BareInputProps<DateRange> & DateRangeFieldOwnProps
>(function BareDateRangeField(
  { value, onChange, onBlur, accessibilityLabel, invalid, disabled, placeholder, clearable = true },
  ref
) {
  const pickEnd = (start: string) => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: dateKeyToValue(value.end !== '' && value.end >= start ? value.end : start),
      minimumDate: dateKeyToValue(start),
      timeZoneName: 'Asia/Singapore',
      onValueChange: (_event, date) => {
        onChange({ start, end: dateKeyOf(date) });
        onBlur?.();
      },
      onDismiss: () => onBlur?.(),
    });
  };

  const open = () => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: dateKeyToValue(value.start === '' ? todayKey() : value.start),
      timeZoneName: 'Asia/Singapore',
      // The first dialog has to close before the second one can open.
      onValueChange: (_event, date) => setTimeout(() => pickEnd(dateKeyOf(date)), 0),
      onDismiss: () => onBlur?.(),
    });
  };

  const complete = value.start !== '' && value.end !== '';

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
            value={complete ? formatDateRange(value.start, value.end) : ''}
            className={disabled ? 'text-on-disabled' : undefined}
          />
          {clearable && complete && !disabled && (
            <InputSlot
              accessibilityRole="button"
              accessibilityLabel="Clear"
              onPress={() => {
                onChange(EMPTY_DATE_RANGE);
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
 * Date range field (Billing period). Like `DateField`, it opens Android's system date dialog
 * directly, once for the first day and once for the last, and shows the span as `1–31 Oct 2026`.
 * Standalone, pass `value` and `onChange`; inside a form, pass `fieldControlProps`.
 *
 * @param placeholder - Shown while nothing is picked.
 * @param clearable - Shows an × button to clear the span. Defaults to `true`; pass `false` to hide it.
 * @param value - The picked span, or {@link EMPTY_DATE_RANGE} (standalone only).
 * @param onChange - Called with the new span once both days are picked, or {@link EMPTY_DATE_RANGE} on clear (standalone only).
 * @param fieldControlProps - Binds the field to a form field (form-controlled only).
 */
export const DateRangeField = withFormControlledFieldOf<
  DateRangeFieldOwnProps,
  ComponentRef<typeof View>,
  DateRange
>(BareDateRangeField, EMPTY_DATE_RANGE);
