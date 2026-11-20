import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';

import { Icon } from '@/components/icon';
import { Checkbox as NativeCheckbox, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';

/** The box and its label, once the value and handler are known. */
function CheckboxView({
  label,
  value,
  onChange,
  disabled,
  className,
  children,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <NativeCheckbox
      value={label}
      isChecked={value}
      isDisabled={disabled}
      onChange={onChange}
      aria-label={label}
      className={className}
    >
      <CheckboxIndicator>{value ? <Icon as={Check} size={14} strokeWidth={3} className="text-on-primary" /> : null}</CheckboxIndicator>
      {children ?? <CheckboxLabel>{label}</CheckboxLabel>}
    </NativeCheckbox>
  );
}

/** The form-controlled branch: reads the field, then draws the checkbox. */
function BoundCheckbox<T extends FieldValues>({
  control,
  name,
  ...view
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const { field } = useController({ control, name });
  return <CheckboxView {...view} value={!!field.value} onChange={field.onChange} />;
}

/**
 * Checkbox with its label beside it, at least 44px high. A thin wrapper over the native gluestack checkbox in
 * `ui/checkbox`, which holds the look. Standalone, pass `value` and `onChange`. Inside a form, pass `control` and `name`.
 *
 * @param label - The text beside the box. Also its accessibility label.
 * @param value - Whether it is ticked (standalone only).
 * @param onChange - Called with the new value (standalone only).
 * @param control - The form's control (form-controlled only).
 * @param name - The boolean field's name (form-controlled only).
 * @param disabled - Dims it and ignores taps.
 * @param className - Extra classes, such as `self-end`.
 * @param children - Content beside the box in place of the label text, such as Send message's charge rows (standalone
 *   only). `label` stays the accessibility label.
 */
export function Checkbox<T extends FieldValues = FieldValues>(
  props: { label: string; disabled?: boolean; className?: string } & (
    | { control: Control<T>; name: FieldPath<T>; value?: never; onChange?: never; children?: never }
    | { value: boolean; onChange: (value: boolean) => void; control?: never; name?: never; children?: ReactNode }
  ),
) {
  const { label, disabled, className } = props;
  if (props.control) {
    return <BoundCheckbox control={props.control} name={props.name} label={label} disabled={disabled} className={className} />;
  }
  return (
    <CheckboxView label={label} value={props.value} onChange={props.onChange} disabled={disabled} className={className}>
      {props.children}
    </CheckboxView>
  );
}
