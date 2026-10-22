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
} from '@/components/ui/select';
import { withFormControlledField, BareInputProps } from './form-field/';

/** One choice in a `SelectField`. */
export interface SelectOption {
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
}

/**
 * Bare select: the 48px outlined field that opens a bottom sheet list, with no label or form
 * state. The value is the picked option's `value`, or `''` when nothing is picked. While a
 * choice is picked, an × button in the field clears it back to `''`.
 */
export const BareSelectField = forwardRef<
  ComponentRef<typeof SelectTrigger>,
  BareInputProps & SelectFieldOwnProps
>(function BareSelectField(
  { value, onChange, onBlur, accessibilityLabel, invalid, disabled, options, placeholder },
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
        {selected && !disabled && (
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
        <SelectIcon as={ChevronDown} />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent>
          <SelectDragIndicatorWrapper>
            <SelectDragIndicator />
          </SelectDragIndicatorWrapper>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              label={option.label}
              value={option.value}
              textStyle={option.value === value ? { className: 'font-manrope-extrabold' } : undefined}
            />
          ))}
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
 * @param options - The choices.
 * @param placeholder - Shown while nothing is picked.
 * @param value - The picked option's value, or `''` (standalone only).
 * @param onChange - Called with the picked option's value (standalone only).
 * @param fieldControlProps - Binds the select to a form field (form-controlled only).
 */
export const SelectField = withFormControlledField(BareSelectField);
