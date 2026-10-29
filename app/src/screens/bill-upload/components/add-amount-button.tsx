import { Plus } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { Icon } from '@/components';
import type { AddAmountButtonProps } from '../types';

/**
 * The dashed orange "Add" that stands in for the amount field of a line the bill had no amount
 * for. Tapping it reveals the field.
 */
export function AddAmountButton({ lineName, onPress }: AddAmountButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${lineName} amount`}
      onPress={onPress}
      className="h-12 w-full flex-row items-center gap-2 rounded-field border-[1.5px] border-dashed border-warning px-3"
    >
      <Icon as={Plus} size={16} className="text-warning" />
      <Text className="font-manrope-bold text-body text-warning">Add</Text>
    </Pressable>
  );
}
