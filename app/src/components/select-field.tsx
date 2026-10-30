import { ChevronDown, X } from 'lucide-react-native';
import { type ComponentRef, forwardRef } from 'react';
import { Pressable } from 'react-native';

import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  type SelectItemExtras,
} from '@/components/ui/select';
import { withFormControlledField, BareInputProps } from './form-field/';

/**
 * One choice in a `SelectField`. The optional `detail`, `detailTone` and `trailing` show only in
 * the list, as a second line and a figure on the right; the field shows the label alone.
 */
export interface SelectOption extends SelectItemExtras {
  /** What the user sees in the field and in the list. */
  label: string;
  /** What the field's value becomes when this choice is picked. */
  value: string;
}

/** The props only the select has, on top of the shared input props. */
export interface SelectFieldOwnProps {
  /** The choices, in the order they are listed. */
  options: SelectOption[];
  /** Shown in the field while no choice is picked (the value is `''`). */
  placeholder?: string;
  /** Shows an × button to clear a picked choice. Off by default; pass `true` to opt in. */
  clearable?: boolean;
}

/**
 * Bare select: the 48px outlined field that opens a bottom sheet list, with no label or form
 * state. The value is the picked option's `value`, or `''` when nothing is picked. While a
 * choice is picked, an × button in the field clears it back to `''` (opt in with `clearable`).
 */
export const BareSelectField = forwardRef<
  ComponentRef<typeof SelectTrigger>,
  BareInputProps & SelectFieldOwnProps
>(function BareSelectField(
  {
    value,
    onChange,
    onBlur,
    accessibilityLabel,
    invalid,
    disabled,
    options,
    placeholder,
    clearable = false,
  },
  ref
) {
  const selected = options.find((option) => option.value === value);
  return (
    <Select
      selectedValue={value}
      initialLabel={selected?.label}
      onValueChange={onChange}
      onClose={onBlur}
      isInvalid={invalid}
      isDisabled={disabled}
    >
      <SelectTrigger ref={ref} accessibilityLabel={accessibilityLabel}>
        {/* The label is passed in so the field follows the value when a form sets it. */}
        <SelectInput placeholder={placeholder} value={selected?.label ?? ''} />
        {clearable && selected && !disabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear"
            onPress={() => {
              onChange('');
              onBlur?.();
            }}
            className="-mr-1 h-11 w-11 items-center justify-center"
          >
            <SelectIcon as={X} />
          </Pressable>
        )}
        <SelectIcon as={ChevronDown} className={disabled ? 'text-on-disabled' : undefined} />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent>
          <SelectDragIndicatorWrapper>
            <SelectDragIndicator />
          </SelectDragIndicatorWrapper>
          {options.map(({ label, value: optionValue, detail, detailTone, trailing }) => {
            const extras: SelectItemExtras = { detail, detailTone, trailing };
            const twoLine = detail !== undefined;
            return (
              <SelectItem
                key={optionValue}
                label={label}
                value={optionValue}
                className={twoLine ? 'py-2' : undefined}
                textStyle={{
                  ...extras,
                  className: optionValue === value ? 'font-manrope-extrabold' : twoLine ? 'font-manrope-bold' : undefined,
                }}
              />
            );
          })}
        </SelectContent>
      </SelectPortal>
    </Select>
  );
});

/**
 * Select list in a bottom sheet (screen mapping doc: Select). Standalone, pass `value` and
 * `onChange`. Inside a form, pass `fieldControlProps` instead: the select is then bound to that
 * react-hook-form field and wrapped in the label-above form field. The look lives in `ui/select`.
 *
 * @param options - The choices, each optionally with a detail line and a trailing figure in the list.
 * @param placeholder - Shown while nothing is picked.
 * @param clearable - Shows an × button to clear the choice. Defaults to `false`; pass `true` to show it.
 * @param value - The picked option's value, or `''` (standalone only).
 * @param onChange - Called with the picked option's value (standalone only).
 * @param fieldControlProps - Binds the select to a form field (form-controlled only).
 */
export const SelectField = withFormControlledField(BareSelectField);
