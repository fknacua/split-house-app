'use client';
import { createButton } from '@gluestack-ui/core/button/creator';
import { UIIcon } from '@gluestack-ui/core/icon/creator';
import {
  tva,
  useStyleContext,
  withStyleContext,
  type VariantProps,
} from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Spinner } from '../spinner';
const SCOPE = 'BUTTON';
const Root = withStyleContext(Pressable, SCOPE);
const StyledUIIcon = styled(UIIcon, {
  className: "style",
});
const UIButton = createButton({
  Root: Root,
  Text,
  Group: View,
  Spinner,
  Icon: StyledUIIcon,
});
const FADE = 'data-[active=true]:opacity-80';

/*
 * Variants follow the design. Filled variants keep their shape when disabled (flat
 * disabled fill); outlined ones keep a border in a muted colour; ghost stays transparent.
 * Pressed feedback: filled variants fade, outlined and ghost ones show a background
 * (touch has no hover, so only the pressed state is styled).
 */
const buttonStyle = tva({
  base: 'rounded-full flex-row items-center justify-center gap-1.5 data-[focus-visible=true]:web:outline-none data-[focus-visible=true]:web:ring-2 h-fit',
  variants: {
    variant: {
      default: `bg-primary ${FADE} data-[disabled=true]:bg-disabled`,
      destructive: `bg-danger ${FADE} data-[disabled=true]:bg-disabled`,
      warning: `border border-warning bg-warning-container ${FADE} data-[disabled=true]:border-transparent data-[disabled=true]:bg-disabled`,
      outline:
        'border border-outline data-[active=true]:bg-container data-[disabled=true]:border-outline-variant',
      'outline-warning':
        'border border-warning data-[active=true]:bg-warning-tint data-[disabled=true]:border-outline-variant',
      'outline-destructive':
        'border border-danger data-[active=true]:bg-danger-tint data-[disabled=true]:border-outline-variant',
      ghost: 'data-[active=true]:bg-container',
    },
    size: {
      default: 'h-12 px-6',
      sm: 'h-11 px-4',
    },
  },
});

const variantContent = {
  default: 'text-on-primary',
  destructive: 'text-on-danger',
  warning: 'text-warning',
  outline: 'text-on-surface',
  'outline-warning': 'text-warning',
  'outline-destructive': 'text-danger',
  ghost: 'text-on-surface',
};

// The disabled colour comes from the style context, not a data-[disabled] selector: it must
// override the variant colour, and listing it after `variant` lets tailwind-merge keep it.
const disabledContent = { true: 'text-on-disabled' };

// tailwind-merge (inside tva) doesn't know our custom text sizes, so it reads `text-body` as a
// colour and lets it cancel the label colour. Declaring them as font sizes keeps both. (This
// tailwind-merge version takes the groups directly, with no `extend` key.) A font size also
// cancels an earlier line height, so `leading-5` follows the size inside each size class.
const textSizeMergeConfig = {
  twMergeConfig: {
    classGroups: {
      'font-size': [{ text: ['hero', 'title', 'sheet-title', 'field', 'body', 'label', 'caption'] }],
    },
  },
};

const buttonTextStyle = tva(
  {
    base: 'web:select-none font-manrope-bold',
    parentVariants: {
      variant: variantContent,
      size: {
        default: 'text-body leading-5',
        sm: 'text-label leading-5',
      },
      disabled: disabledContent,
    },
  },
  textSizeMergeConfig,
);

const buttonSpinnerStyle = tva({
  base: '',
  parentVariants: {
    variant: variantContent,
    disabled: disabledContent,
  },
});

const buttonIconStyle = tva({
  base: 'fill-none pointer-events-none shrink-0',
  parentVariants: {
    variant: variantContent,
    size: {
      default: 'h-4 w-4',
      sm: 'h-4 w-4',
    },
    disabled: disabledContent,
  },
});
const buttonGroupStyle = tva({
  base: '',
  variants: {
    space: {
      'xs': 'gap-1',
      'sm': 'gap-2',
      'md': 'gap-3',
      'lg': 'gap-4',
      'xl': 'gap-5',
      '2xl': 'gap-6',
      '3xl': 'gap-7',
      '4xl': 'gap-8',
    },
    isAttached: {
      true: 'gap-0',
    },
    flexDirection: {
      'row': 'flex-row',
      'column': 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    },
  },
});
type IButtonProps = Omit<
  React.ComponentPropsWithoutRef<typeof UIButton>,
  'context'
> &
  VariantProps<typeof buttonStyle> & { className?: string };
const Button = React.forwardRef<
  React.ElementRef<typeof UIButton>,
  IButtonProps
>(({ className, variant = 'default', size = 'default', isDisabled, ...props }, ref) => {
  return (
    <UIButton
      ref={ref}
      {...props}
      isDisabled={isDisabled}
      className={buttonStyle({ variant, size, class: className })}
      context={{ variant, size, disabled: !!isDisabled }}
    />
  );
});
type IButtonTextProps = React.ComponentPropsWithoutRef<typeof UIButton.Text> &
  VariantProps<typeof buttonTextStyle> & { className?: string };
const ButtonText = React.forwardRef<
  React.ElementRef<typeof UIButton.Text>,
  IButtonTextProps
>(({ className, size, ...props }, ref) => {
  const {
    size: parentSize,
    variant: parentVariant,
    disabled: parentDisabled,
  } = useStyleContext(SCOPE);
  return (
    <UIButton.Text
      ref={ref}
      {...props}
      className={buttonTextStyle({
        parentVariants: {
          size: parentSize,
          variant: parentVariant,
          disabled: parentDisabled,
        },
        size,
        class: className,
      })}
    />
  );
});
const ButtonSpinner = React.forwardRef<
  React.ElementRef<typeof UIButton.Spinner>,
  React.ComponentPropsWithoutRef<typeof UIButton.Spinner>
>(({ className, ...props }, ref) => {
  const { variant: parentVariant, disabled: parentDisabled } = useStyleContext(SCOPE);
  return <UIButton.Spinner ref={ref} size="small" {...props} className={buttonSpinnerStyle({ parentVariants: { variant: parentVariant, disabled: parentDisabled }, class: className })} />;
});
type IButtonIcon = React.ComponentPropsWithoutRef<typeof UIButton.Icon> &
  VariantProps<typeof buttonIconStyle> & {
    className?: string | undefined;
    as?: React.ElementType;
    height?: number;
    width?: number;
  };
const ButtonIcon = React.forwardRef<
  React.ElementRef<typeof UIButton.Icon>,
  IButtonIcon
>(({ className, size, ...props }, ref) => {
  const {
    size: parentSize,
    variant: parentVariant,
    disabled: parentDisabled,
  } = useStyleContext(SCOPE);
  if (typeof size === 'number') {
    return (
      <UIButton.Icon
        ref={ref}
        {...props}
        className={buttonIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props.height !== undefined || props.width !== undefined) &&
    size === undefined
  ) {
    return (
      <UIButton.Icon
        ref={ref}
        {...props}
        className={buttonIconStyle({ class: className })}
      />
    );
  }
  return (
    <UIButton.Icon
      {...props}
      className={buttonIconStyle({
        parentVariants: {
          size: parentSize,
          variant: parentVariant,
          disabled: parentDisabled,
        },
        size,
        class: className,
      })}
      ref={ref}
    />
  );
});
type IButtonGroupProps = React.ComponentPropsWithoutRef<typeof UIButton.Group> &
  VariantProps<typeof buttonGroupStyle>;
const ButtonGroup = React.forwardRef<
  React.ElementRef<typeof UIButton.Group>,
  IButtonGroupProps
>(
  (
    {
      className,
      space = 'md',
      isAttached = false,
      flexDirection = 'column',
      ...props
    },
    ref
  ) => {
    return (
      <UIButton.Group
        className={buttonGroupStyle({
          class: className,
          space,
          isAttached,
          flexDirection,
        })}
        {...props}
        ref={ref}
      />
    );
  }
);
Button.displayName = 'Button';
ButtonText.displayName = 'ButtonText';
ButtonSpinner.displayName = 'ButtonSpinner';
ButtonIcon.displayName = 'ButtonIcon';
ButtonGroup.displayName = 'ButtonGroup';
export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText };
