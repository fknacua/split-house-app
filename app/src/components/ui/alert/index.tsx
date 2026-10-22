'use client';
import { createAlert } from '@gluestack-ui/core/alert/creator';
import { UIIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import React from 'react';
import { Text, View } from 'react-native';

const SCOPE = 'ALERT';

const alertStyle = tva({
  base: 'rounded-alert border px-3.5 py-3 flex-row gap-3 items-start',
  variants: {
    variant: {
      info: 'bg-info-tint border-info-line',
      warning: 'bg-warning-tint border-warning-line',
      danger: 'bg-danger-tint border-danger-line',
      success: 'bg-success-tint border-success-line',
    },
  },
});

const alertTextStyle = tva({
  base: 'text-label',
  parentVariants: {
    variant: {
      info: 'text-on-info-container',
      warning: 'text-on-warning-container',
      danger: 'text-on-danger-tint',
      success: 'text-on-success-container',
    },
  },
});

const alertIconStyle = tva({
  base: 'fill-none w-5 h-5 mt-px shrink-0',
  parentVariants: {
    variant: {
      info: 'text-info',
      warning: 'text-warning',
      danger: 'text-danger',
      success: 'text-success',
    },
  },
});

const StyledUIIcon = styled(UIIcon, {
  className: "style",
});

export const UIAlert = createAlert({
  Root: withStyleContext(View, SCOPE),
  Text: Text,
  Icon: StyledUIIcon,
});

type IAlertProps = Omit<
  React.ComponentPropsWithoutRef<typeof UIAlert>,
  'context'
> &
  VariantProps<typeof alertStyle>;

const Alert = React.forwardRef<React.ComponentRef<typeof UIAlert>, IAlertProps>(
  function Alert({ className, variant = 'info', ...props }, ref) {
    return (
      <UIAlert
        className={alertStyle({ variant, class: className })}
        context={{ variant }}
        ref={ref}
        {...props}
      />
    );
  }
);

type IAlertTextProps = React.ComponentPropsWithoutRef<typeof UIAlert.Text> &
  VariantProps<typeof alertTextStyle>;

const AlertText = React.forwardRef<
  React.ComponentRef<typeof UIAlert.Text>,
  IAlertTextProps
>(function AlertText({ className, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <UIAlert.Text
      className={alertTextStyle({
        class: className,
        parentVariants: {
          variant: parentVariant,
        },
      })}
      {...props}
      ref={ref}
    />
  );
});

type IAlertIconProps = React.ComponentPropsWithoutRef<typeof UIAlert.Icon> &
  VariantProps<typeof alertIconStyle> & {
    height?: number;
    width?: number;
  };

const AlertIcon = React.forwardRef<
  React.ComponentRef<typeof UIAlert.Icon>,
  IAlertIconProps
>(function AlertIcon({ className, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <UIAlert.Icon
      className={alertIconStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
      ref={ref}
    />
  );
});

Alert.displayName = 'Alert';
AlertText.displayName = 'AlertText';
AlertIcon.displayName = 'AlertIcon';

export { Alert, AlertIcon, AlertText };
