'use client';
import React from 'react';
import { View } from 'react-native';
import { cardStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

type ICardProps = React.ComponentPropsWithoutRef<typeof View> & 
  VariantProps<typeof cardStyle> & { 
    className?: string;
    size?: 'none' | 'default' | 'sm';
  };

const Card = React.forwardRef<React.ComponentRef<typeof View>, ICardProps>(
  function Card({ className, size = 'default', ...props }, ref) {
    return (
      <View className={cardStyle({ size, class: className })} {...props} ref={ref} />
    );
  }
);

Card.displayName = 'Card';

export { Card };
