import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, MoneyInput, TextInput } from '@/components';
import type { LineRowProps } from '../types';

/** One utility line on Review bill: an editable name, an amount and a remove button. */
export function LineRow({ control, index, label, onRemove }: LineRowProps) {
  const name = label.trim() || 'line';
  return (
    <View className="flex-row items-start gap-2">
      <TextInput
        placeholder="Field"
        fieldControlProps={{ control, name: `lines.${index}.label`, label: 'Field', className: 'min-w-0 flex-1' }}
      />
      <MoneyInput
        placeholder="0.00"
        fieldControlProps={{ control, name: `lines.${index}.cents`, label: 'Amount', className: 'w-28' }}
      />
      <Button
        label={`Remove ${name}`}
        icon={X}
        iconOnly
        variant="ghost"
        size="small"
        onPress={onRemove}
        className="-ml-2 mt-[26px]"
      />
    </View>
  );
}
