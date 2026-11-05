import { CircleAlert, TriangleAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { FieldMessageProps } from '../types';

/** A red error or amber warning under a split field. An error replaces a warning, and with neither it draws nothing. */
export function FieldMessage({ error, warning, alignEnd }: FieldMessageProps) {
  const message = error ?? warning;
  if (!message) return null;
  const color = error ? 'text-danger' : 'text-warning';
  return (
    <View className={`flex-row items-center gap-1 ${alignEnd ? 'justify-end' : ''}`}>
      <Icon as={error ? CircleAlert : TriangleAlert} size={14} className={color} />
      <Text className={`font-manrope-semibold text-caption ${color} ${alignEnd ? '' : 'min-w-0 flex-1'}`}>{message}</Text>
    </View>
  );
}
