import {
  type ComponentType,
  type ReactElement,
  type Ref,
  type RefAttributes,
  forwardRef,
  useCallback,
} from 'react';
import type { FieldValues } from 'react-hook-form';

import { FormField } from '../form-field';
import { useFormControlledField } from '../hooks/use-form-controlled-field';
import type { BareInputProps, FieldControlProps, WithFieldControlProps } from '../types';

/** Sets one ref to a node; works for both callback refs and ref objects. */
function assignRef<R>(ref: Ref<R> | undefined, node: R | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as { current: R | null }).current = node;
}

/**
 * Gives a bare input an optional `fieldControlProps` prop. Without it the input is standalone and
 * behaves as before. With it the input is bound to a react-hook-form field and wrapped in the
 * label-above `FormField`: the label, helper and error text come from `fieldControlProps` and the
 * form state. The branch is written here once, so each input file only holds its bare component.
 *
 * This is the form for inputs whose value is a string: `Own` and `R` are inferred from the bare
 * input. For another value type, such as `number | null`, use `withFormControlledFieldOf`.
 *
 * @param Bare - The bare input. It receives `BareInputProps` plus its own props.
 * @returns A generic component, so `fieldControlProps.name` is checked against the form's fields.
 */
export function withFormControlledField<Own extends object, R>(
  Bare: ComponentType<Own & BareInputProps & RefAttributes<R>>
) {
  return withFormControlledFieldOf<Own, R, string>(Bare, '');
}

/**
 * Same as `withFormControlledField`, for an input whose value is not a string. The type
 * arguments are always passed explicitly: TypeScript cannot infer `Own` once the value type is
 * part of the props, for example
 * `withFormControlledFieldOf<MoneyInputOwnProps, ComponentRef<typeof Field>, number | null>(Bare, null)`.
 *
 * @param Bare - The bare input. It receives `BareInputProps<V>` plus its own props.
 * @param emptyValue - What the bare input gets while the field has no value, for example `null`.
 * @returns A generic component, so `fieldControlProps.name` is checked against the form's fields.
 */
export function withFormControlledFieldOf<Own extends object, R, V>(
  Bare: ComponentType<Own & BareInputProps<V> & RefAttributes<R>>,
  emptyValue: V
) {
  const Bound = forwardRef<R, Own & { fieldControlProps: FieldControlProps<FieldValues> }>(
    function Bound({ fieldControlProps, ...own }, ref) {
      const { binding, message } = useFormControlledField<FieldValues, V>(fieldControlProps, emptyValue);
      const { ref: fieldRef, ...bareProps } = binding;
      // react-hook-form needs its own ref to focus the field on error, so set both refs.
      const mergedRef = useCallback(
        (node: R | null) => {
          assignRef(fieldRef, node);
          assignRef(ref, node);
        },
        [fieldRef, ref]
      );
      const { label, required, helper, disabled, className } = fieldControlProps;
      return (
        <FormField
          label={label}
          required={required}
          helper={helper}
          error={message}
          disabled={disabled}
          className={className}
        >
          <Bare {...(own as unknown as Own)} {...bareProps} ref={mergedRef} />
        </FormField>
      );
    }
  );
  Bound.displayName = 'FormControlledField';
  // forwardRef's props type cannot be resolved for a generic `Own`, so view it as a plain component.
  const BoundField = Bound as unknown as ComponentType<
    Own & { fieldControlProps: FieldControlProps<FieldValues> } & RefAttributes<R>
  >;

  const Field = forwardRef<R, Own & { fieldControlProps?: FieldControlProps<FieldValues> }>(
    function Field(props, ref) {
      if (props.fieldControlProps) {
        return (
          <BoundField
            {...(props as Own & { fieldControlProps: FieldControlProps<FieldValues> })}
            ref={ref}
          />
        );
      }
      return <Bare {...(props as unknown as Own & BareInputProps<V>)} ref={ref} />;
    }
  );
  Field.displayName = `WithFieldControl(${Bare.displayName ?? Bare.name ?? 'Input'})`;

  // forwardRef erases the form's generic; restore it so `T` is inferred from `control`.
  return Field as unknown as <T extends FieldValues = FieldValues>(
    props: WithFieldControlProps<T, Own, V> & RefAttributes<R>
  ) => ReactElement | null;
}
