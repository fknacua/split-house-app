import { CalendarDays, X } from 'lucide-react-native';
import { type ComponentRef, forwardRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { type BareInputProps, withFormControlledField } from '@/components/form-field/';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { formatMonthLabel } from '@splithouse/shared';
import { monthPickerOpeningYear, type MonthPickerMonths } from './helpers';
import { MonthPickerSheet } from './month-picker-sheet';

/** The props only the month picker has, on top of the shared input props. */
export interface MonthPickerOwnProps {
  /** The sheet's title, such as "Starts from". */
  sheetTitle: string;
  /** The months that can be picked: `YYYY-MM` keys, or `{ from }` for every month from one onward. */
  months: MonthPickerMonths;
  /** Shown in the field while no month is picked (the value is `''`). */
  placeholder?: string;
  /** Shows an × button to clear a picked month. Off by default; pass `true` to opt in. */
  clearable?: boolean;
}

/**
 * Bare month picker: the 48px outlined field with a calendar icon, showing the month as "November 2026",
 * that opens the sheet on the picked month's year.
 */
const BareMonthPicker = forwardRef<ComponentRef<typeof View>, BareInputProps & MonthPickerOwnProps>(
  function BareMonthPicker(
    { value, onChange, onBlur, accessibilityLabel, invalid, disabled, sheetTitle, months, placeholder, clearable = false },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(() => monthPickerOpeningYear(value, months));

    const openSheet = () => {
      setYear(monthPickerOpeningYear(value, months));
      setOpen(true);
    };

    const close = () => {
      setOpen(false);
      onBlur?.();
    };

    return (
      <View ref={ref}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openSheet}
        >
          <Input isInvalid={invalid} isDisabled={disabled}>
            {/* The text is display only, so taps fall through to the pressable that opens the sheet. */}
            <InputField
              editable={false}
              pointerEvents="none"
              placeholder={placeholder}
              value={value === '' ? '' : formatMonthLabel(value)}
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
            <InputIcon
              as={CalendarDays}
              className={`size-[22px] ${disabled ? 'text-on-disabled' : 'text-on-surface'}`}
            />
          </Input>
        </Pressable>
        <MonthPickerSheet
          open={open}
          title={sheetTitle}
          year={year}
          onYearChange={setYear}
          months={months}
          value={value}
          onPick={(month) => {
            onChange(month);
            close();
          }}
          onClose={close}
        />
      </View>
    );
  }
);

/**
 * Month picker (Starts from): a field that opens a sheet with a year row and a grid of months, since
 * neither gluestack nor Android's date dialog has a month-only mode. The value is a `YYYY-MM` key, or `''`
 * when nothing is picked. Standalone, pass `value` and `onChange`; inside a form, pass `fieldControlProps`.
 *
 * @param sheetTitle - The sheet's title, such as "Starts from".
 * @param months - The month keys that can be picked, or `{ from }` for every month from one onward. A month not allowed shows disabled.
 * @param placeholder - Shown while nothing is picked.
 * @param clearable - Shows an × button to clear the month. Defaults to `false`; pass `true` to show it.
 * @param value - The picked month key, or `''` (standalone only).
 * @param onChange - Called with the picked month key (standalone only).
 * @param accessibilityLabel - The field's label for screen readers (standalone only).
 * @param fieldControlProps - Binds the field to a form field (form-controlled only).
 */
export const MonthPicker = withFormControlledField(BareMonthPicker);
