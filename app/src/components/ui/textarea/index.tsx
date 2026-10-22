'use client';
import React from 'react';
import { createTextarea } from '@gluestack-ui/core/textarea/creator';
import { View, TextInput } from 'react-native';
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const SCOPE = 'TEXTAREA';
const UITextarea = createTextarea({
  Root: withStyleContext(View, SCOPE),
  Input: TextInput,
});

const textareaStyle = tva({
  base: 'w-full rounded-field border border-outline bg-surface px-3.5 py-3 data-[focus=true]:border-2 data-[focus=true]:border-primary data-[focus=true]:px-[13px] data-[focus=true]:py-[11px] data-[invalid=true]:border-2 data-[invalid=true]:border-danger data-[invalid=true]:px-[13px] data-[invalid=true]:py-[11px] data-[disabled=true]:border-outline-variant data-[disabled=true]:bg-disabled',

  variants: {
    variant: {
      default: '',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
  },
});

const textareaInputStyle = tva({
  base: 'flex-1 p-0 text-field font-manrope-medium text-on-surface placeholder:text-on-surface-variant web:outline-0 web:outline-none',
});

type ITextareaProps = React.ComponentProps<typeof UITextarea> &
  VariantProps<typeof textareaStyle>;

const Textarea = React.forwardRef<
  React.ComponentRef<typeof UITextarea>,
  ITextareaProps
>(function Textarea(
  { className, variant = 'default', size = 'md', ...props },
  ref
) {
  return (
    <UITextarea
      ref={ref}
      {...props}
      className={textareaStyle({ variant, class: className })}
      context={{ size }}
    />
  );
});

type ITextareaInputProps = React.ComponentProps<typeof UITextarea.Input> &
  VariantProps<typeof textareaInputStyle>;

const TextareaInput = React.forwardRef<
  React.ComponentRef<typeof UITextarea.Input>,
  ITextareaInputProps
>(function TextareaInput({ className, ...props }, ref) {
  return (
    <UITextarea.Input
      ref={ref}
      {...props}
      textAlignVertical="top"
      className={textareaInputStyle({ class: className })}
    />
  );
});

Textarea.displayName = 'Textarea';
TextareaInput.displayName = 'TextareaInput';

export { Textarea, TextareaInput };
