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
 * @param Bare - The bare input. It receives `BareInputProps` plus its own props.
 * @returns A generic component, so `fieldControlProps.name` is checked against the form's fields.
 */
export function withFormControlledField<Own extends object, R>(
  Bare: ComponentType<Own & BareInputProps & RefAttributes<R>>
) {
  const Bound = forwardRef<R, Own & { fieldControlProps: FieldControlProps<FieldValues> }>(
    function Bound({ fieldControlProps, ...own }, ref) {
      const { binding, message } = useFormControlledField(fieldControlProps);
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
      return <Bare {...(props as unknown as Own & BareInputProps)} ref={ref} />;
    }
  );
  Field.displayName = `WithFieldControl(${Bare.displayName ?? Bare.name ?? 'Input'})`;

  // forwardRef erases the form's generic; restore it so `T` is inferred from `control`.
  return Field as unknown as <T extends FieldValues = FieldValues>(
    props: WithFieldControlProps<T, Own> & RefAttributes<R>
  ) => ReactElement | null;
}
