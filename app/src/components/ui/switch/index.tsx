'use client';
import React from 'react';
import { Switch as RNSwitch } from 'react-native';
import { createSwitch } from '@gluestack-ui/core/switch/creator';
import {
  tva,
  withStyleContext,
  type VariantProps,
} from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';

// RN's Switch takes its colours as props, not styles, so token colour classes are mapped onto them.
const StyledRNSwitch = styled(RNSwitch, {
  className: { target: 'style' },
  thumbClassName: {
    target: false,
    nativeStyleMapping: { color: 'thumbColor' },
  },
  trackOnClassName: {
    target: false,
    nativeStyleMapping: { color: 'trackColor.true' },
  },
  trackOffClassName: {
    target: false,
    nativeStyleMapping: { color: 'trackColor.false' },
  },
});

const UISwitch = createSwitch({
  Root: withStyleContext(StyledRNSwitch),
});

const switchStyle = tva({
  base: 'data-[focus=true]:outline-0 data-[focus=true]:ring-2 data-[focus=true]:ring-indicator-primary web:cursor-pointer disabled:cursor-not-allowed data-[invalid=true]:border-destructive data-[invalid=true]:rounded-xl data-[invalid=true]:border-2',

  variants: {
    size: {
      sm: 'scale-[1]',
      md: 'scale-[1.2]',
      lg: 'scale-[1.4]',
    },
  },
});

type ISwitchProps = React.ComponentProps<typeof UISwitch> &
  VariantProps<typeof switchStyle>;
const Switch = React.forwardRef<
  React.ComponentRef<typeof UISwitch>,
  ISwitchProps
>(function Switch({ className, size = 'md', value, isDisabled, ...props }, ref) {
  const thumbClassName = isDisabled
    ? 'text-on-disabled'
    : value
      ? 'text-on-primary'
      : 'text-outline';
  const trackOnClassName = isDisabled ? 'text-on-disabled' : 'text-primary';
  const trackOffClassName = isDisabled ? 'text-disabled' : 'text-track';
  return (
    <UISwitch
      ref={ref}
      {...props}
      value={value}
      isDisabled={isDisabled}
      thumbClassName={thumbClassName}
      trackOnClassName={trackOnClassName}
      trackOffClassName={trackOffClassName}
      className={switchStyle({ size, class: `${isDisabled ? 'opacity-60' : ''} ${className ?? ''}` })}
    />
  );
});

Switch.displayName = 'Switch';
export { Switch };
