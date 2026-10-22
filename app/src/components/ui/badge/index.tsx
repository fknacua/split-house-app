'use client';
import { PrimitiveIcon, UIIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import React from 'react';
import { Text, View } from 'react-native';
import { Svg } from 'react-native-svg';

const SCOPE = 'BADGE';

const badgeStyle = tva({
  base: 'flex-row items-center justify-center gap-1 self-start rounded-full px-2.5 py-0.5',
  variants: {
    variant: {
      neutral: 'bg-container',
      primary: 'bg-primary',
      success: 'bg-success-container',
      warning: 'bg-warning-container',
      danger: 'bg-danger-container',
      info: 'bg-info-container',
    },
  },
});

// tailwind-merge (inside tva) doesn't know our custom text sizes, so it reads `text-caption` as a
// colour and lets it cancel the label colour. Declaring them as font sizes keeps both.
const textSizeMergeConfig = {
  twMergeConfig: {
    classGroups: {
      'font-size': [{ text: ['hero', 'title', 'sheet-title', 'field', 'body', 'label', 'caption'] }],
    },
  },
};

const variantContent = {
  neutral: 'text-on-surface-variant',
  primary: 'text-on-primary',
  success: 'text-on-success-container',
  warning: 'text-on-warning-container',
  danger: 'text-on-danger-container',
  info: 'text-on-info-container',
};

const badgeTextStyle = tva(
  {
    base: 'font-manrope-bold text-caption',
    parentVariants: { variant: variantContent },
  },
  textSizeMergeConfig,
);

const badgeIconStyle = tva({
  base: 'fill-none h-3 w-3 pointer-events-none',
  parentVariants: { variant: variantContent },
});

const ContextView = withStyleContext(View, SCOPE);

type IBadgeProps = React.ComponentPropsWithoutRef<typeof ContextView> &
  VariantProps<typeof badgeStyle>;
function Badge({
  children,
  variant = 'neutral',
  className,
  ...props
}: { className?: string } & IBadgeProps) {
  return (
    <ContextView
      className={badgeStyle({ variant, class: className })}
      {...props}
      context={{ variant }}
    >
      {children}
    </ContextView>
  );
}

type IBadgeTextProps = React.ComponentPropsWithoutRef<typeof Text> &
  VariantProps<typeof badgeTextStyle>;

const BadgeText = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IBadgeTextProps
>(function BadgeText({ children, className, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <Text
      ref={ref}
      className={badgeTextStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
    >
      {children}
    </Text>
  );
});

type IBadgeIconProps = React.ComponentPropsWithoutRef<typeof PrimitiveIcon> &
  VariantProps<typeof badgeIconStyle> & {
    size?: number;
};
  
const StyledUIIcon = styled(UIIcon, {
  className: {
    target: 'style',
  },
});


const BadgeIcon = React.forwardRef<
  React.ComponentRef<typeof Svg>,
  IBadgeIconProps
>(function BadgeIcon({ className, size, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);

  if (typeof size === 'number') {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props?.height !== undefined || props?.width !== undefined) &&
    size === undefined
  ) {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
      />
    );
  }
  return (
    <StyledUIIcon
      className={badgeIconStyle({
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

Badge.displayName = 'Badge';
BadgeText.displayName = 'BadgeText';
BadgeIcon.displayName = 'BadgeIcon';

export { Badge, BadgeIcon, BadgeText };
