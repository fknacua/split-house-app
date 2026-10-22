import type { ReactNode, Ref } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

/**
 * The form binding of one field: the form state it reads and the text around the control. Pass
 * it to an input as `fieldControlProps`. When it is built outside the JSX, annotate it with the
 * form's value type, for example `const field: FieldControlProps<ChargeForm> = { ... }`, so
 * `name` stays checked against the form's fields.
 */
export interface FieldControlProps<T extends FieldValues> {
  /** The react-hook-form `control` that owns this field. */
  control: Control<T>;
  /** The field's name in the form values. The value must be a string. */
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  helper?: string;
  /** Overrides the form state's error, for a server error that is not on the field yet. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * What a form binding hands to a bare input: the field state it needs, named to match the bare
 * inputs' props so it can be spread straight onto them.
 */
export interface FieldBinding {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  ref: Ref<any>;
  accessibilityLabel: string;
  invalid: boolean;
  disabled?: boolean;
}

/** Props of the render-prop `FieldControl`: the form binding plus the bare input to render. */
export interface RenderPropFieldControlProps<T extends FieldValues> extends FieldControlProps<T> {
  /** Renders the bare input from the field binding. */
  children: (binding: FieldBinding) => ReactNode;
}

/** Props of an input used on its own, with no form: the caller owns the value. */
export interface StandaloneFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Draws the error border. */
  invalid?: boolean;
  disabled?: boolean;
  /** Accessibility label, for when the input is used without a visible label. */
  accessibilityLabel?: string;
  fieldControlProps?: never;
}

/**
 * Props of an input driven by a react-hook-form field. The value, handlers and invalid state come
 * from the form, and `disabled` from `fieldControlProps`, so none of them can be passed as well.
 */
export interface FormControlledFieldProps<T extends FieldValues> {
  fieldControlProps: FieldControlProps<T>;
  value?: never;
  onChange?: never;
  onBlur?: never;
  invalid?: never;
  disabled?: never;
  accessibilityLabel?: never;
}

/**
 * Props of an input that works both ways: standalone, or form-controlled when `fieldControlProps`
 * is passed. `Own` holds the props only that input has, such as `placeholder`.
 */
export type WithFieldControlProps<T extends FieldValues, Own> = (
  | StandaloneFieldProps
  | FormControlledFieldProps<T>
) &
  Own;

/** The props every bare input receives, from either the caller or a form binding. */
export type BareInputProps = Omit<StandaloneFieldProps, 'fieldControlProps'>;
