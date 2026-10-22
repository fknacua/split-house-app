import { type ComponentRef, forwardRef } from 'react';
import { View , Text } from 'react-native';
import type { FieldValues } from 'react-hook-form';

import {
  type BareInputProps,
  type FieldControlProps,
  useFormControlledField,
} from '@/components/form-field/';
import { Switch as NativeSwitch } from '@/components/ui/switch';

/**
 * Bare switch: the on/off control with no label or form state. The look (token colours, size,
 * disabled) lives in `ui/switch`. It sits in a 44px-high box wide enough for the enlarged
 * switch, so the touch target and the layout match what is drawn.
 *
 * @param value - Whether the switch is on.
 * @param onChange - Called with the new value on tap.
 * @param invalid - Draws the error border.
 * @param disabled - Shows the disabled look and ignores taps.
 * @param accessibilityLabel - Needed when the switch has no visible label next to it.
 */
export const Switch = forwardRef<
  ComponentRef<typeof NativeSwitch>,
  Omit<BareInputProps<boolean>, 'onBlur'> & { onBlur?: () => void }
>(function Switch({ value, onChange, onBlur, invalid, disabled, accessibilityLabel }, ref) {
  return (
    <View className="h-11 w-16 items-center justify-center">
      <NativeSwitch
        ref={ref}
        value={value}
        onValueChange={(next: boolean) => {
          onChange(next);
          onBlur?.();
        }}
        isDisabled={disabled}
        isInvalid={invalid}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
});

/** What a `SwitchRow` shows beside the switch. */
interface SwitchRowText {
  /** The row title, 15/22 bold. Also the switch's accessibility label. */
  label: string;
  /** Optional hint under the title, 12/16. */
  description?: string;
}

/** A `SwitchRow` used on its own: the caller owns the value. */
interface StandaloneSwitchRowProps extends SwitchRowText {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  fieldControlProps?: never;
}

/** A `SwitchRow` bound to a react-hook-form field of type boolean. */
interface FormControlledSwitchRowProps<T extends FieldValues> extends SwitchRowText {
  fieldControlProps: Omit<FieldControlProps<T>, 'label' | 'helper' | 'required'>;
  value?: never;
  onChange?: never;
  disabled?: never;
}

/** The row itself, once its value and handlers are known. */
function SwitchRowView({
  label,
  description,
  value,
  onChange,
  disabled,
  invalid,
  message,
  className,
}: SwitchRowText & {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  message?: string;
  className?: string;
}) {
  return (
    <View className={['min-h-14 flex-row items-center justify-between gap-3', className].join(' ')}>
      <View className="flex-1 gap-0.5">
        <Text
          className={[
            'font-manrope-bold text-body',
            disabled ? 'text-on-surface-variant' : 'text-on-surface',
          ].join(' ')}
        >
          {label}
        </Text>
        {message || description ? (
          <Text
            className={[
              'font-manrope-semibold text-caption',
              invalid ? 'text-danger' : 'text-on-surface-variant',
            ].join(' ')}
          >
            {message ?? description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onChange={onChange}
        disabled={disabled}
        invalid={invalid}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** The form-controlled branch: reads the field with the hook, then draws the row. */
function BoundSwitchRow<T extends FieldValues>({
  label,
  description,
  fieldControlProps,
}: SwitchRowText & { fieldControlProps: FieldControlProps<T> }) {
  const { binding, message } = useFormControlledField<T, boolean>(
    { ...fieldControlProps, label },
    false
  );
  return (
    <SwitchRowView
      label={label}
      description={description}
      value={binding.value}
      onChange={binding.onChange}
      disabled={binding.disabled}
      invalid={binding.invalid}
      message={message}
      className={fieldControlProps.className}
    />
  );
}

/**
 * A setting row (screen mapping doc: Switch): the title and an optional hint on the left, the
 * switch on the right, at least 56px high. Unlike the other fields the label sits beside the
 * control, as in the Settings, Add charge and Share boards, so it does not use the label-above
 * `FormField`. Standalone, pass `value` and `onChange`. Inside a form, pass `fieldControlProps`
 * (no `label`, `helper` or `required` there); the form's error text replaces the hint.
 *
 * @param label - The row title.
 * @param description - Optional hint under the title.
 * @param value - Whether the switch is on (standalone only).
 * @param onChange - Called with the new value (standalone only).
 * @param disabled - Shows the disabled look (standalone only; use `fieldControlProps` in a form).
 * @param fieldControlProps - Binds the row to a boolean form field (form-controlled only).
 */
export function SwitchRow<T extends FieldValues = FieldValues>(
  props: StandaloneSwitchRowProps | FormControlledSwitchRowProps<T>
) {
  if (props.fieldControlProps) {
    return (
      <BoundSwitchRow
        label={props.label}
        description={props.description}
        fieldControlProps={props.fieldControlProps as FieldControlProps<T>}
      />
    );
  }
  return (
    <SwitchRowView
      label={props.label}
      description={props.description}
      value={props.value as boolean}
      onChange={props.onChange as (value: boolean) => void}
      disabled={props.disabled}
    />
  );
}
