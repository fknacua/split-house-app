'use client';
import { createCheckbox } from '@gluestack-ui/core/checkbox/creator';
import { UIIcon, type IPrimitiveIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import React from 'react';
import type { TextProps, ViewProps } from 'react-native';
import { Platform, Pressable, Text, View } from 'react-native';

const IndicatorWrapper = React.forwardRef<
  React.ComponentRef<typeof View>,
  ViewProps
>(function IndicatorWrapper({ ...props }, ref) {
  return <View {...props} ref={ref} />;
});

const LabelWrapper = React.forwardRef<
  React.ComponentRef<typeof Text>,
  TextProps
>(function LabelWrapper({ ...props }, ref) {
  return <Text {...props} ref={ref} />;
});

const StyledUIIcon = styled(UIIcon, {
  className: "style",
});

const SCOPE = 'CHECKBOX';


const UICheckbox = createCheckbox({
  // @ts-expect-error : internal implementation for r-19/react-native-web
  Root:
    Platform.OS === 'web'
      ? withStyleContext(View, SCOPE)
      : withStyleContext(Pressable, SCOPE),
  Group: View,
  Icon: StyledUIIcon,
  Label: LabelWrapper,
  Indicator: IndicatorWrapper,
});


const checkboxStyle = tva({
  base: 'group/checkbox min-h-11 flex-row items-center justify-start gap-2.5 data-[disabled=true]:opacity-50',
});

const checkboxIndicatorStyle = tva({
  base: 'justify-center items-center w-5 h-5 shrink-0 rounded-[6px] border-2 border-outline data-[checked=true]:bg-primary data-[checked=true]:border-primary data-[invalid=true]:border-danger data-[disabled=true]:opacity-50',
});

const checkboxLabelStyle = tva({
  base: 'text-on-surface-variant text-label font-manrope-medium data-[disabled=true]:opacity-50',
});

const checkboxIconStyle = tva({
  base: 'text-on-primary fill-none h-3.5 w-3.5',
});

const CheckboxGroup = UICheckbox.Group;

type ICheckboxProps = React.ComponentPropsWithoutRef<typeof UICheckbox> &
  VariantProps<typeof checkboxStyle>;

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof UICheckbox>,
  ICheckboxProps
>(function Checkbox({ className, ...props }, ref) {
  return (
    <UICheckbox
      className={checkboxStyle({ class: className })}
      {...props}
      context={{}}
      ref={ref}
    />
  );
});

type ICheckboxIndicatorProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Indicator
> &
  VariantProps<typeof checkboxIndicatorStyle>;

const CheckboxIndicator = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Indicator>,
  ICheckboxIndicatorProps
>(function CheckboxIndicator({ className, ...props }, ref) {
  return (
    <UICheckbox.Indicator
      className={checkboxIndicatorStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

type ICheckboxLabelProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Label
> &
  VariantProps<typeof checkboxLabelStyle>;
const CheckboxLabel = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Label>,
  ICheckboxLabelProps
>(function CheckboxLabel({ className, ...props }, ref) {
  return (
    <UICheckbox.Label
      className={checkboxLabelStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

type ICheckboxIconProps = React.ComponentPropsWithoutRef<
  typeof UICheckbox.Icon
> &
  IPrimitiveIcon &
  VariantProps<typeof checkboxIconStyle>;

const CheckboxIcon = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Icon>,
  ICheckboxIconProps
>(function CheckboxIcon({ className, size, ...props }, ref) {
  if (typeof size === 'number') {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props.height !== undefined || props.width !== undefined) &&
    size === undefined
  ) {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
      />
    );
  }

  return (
    <UICheckbox.Icon
      className={checkboxIconStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

Checkbox.displayName = 'Checkbox';
CheckboxIndicator.displayName = 'CheckboxIndicator';
CheckboxLabel.displayName = 'CheckboxLabel';
CheckboxIcon.displayName = 'CheckboxIcon';

export {
  Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator,
  CheckboxLabel
};
