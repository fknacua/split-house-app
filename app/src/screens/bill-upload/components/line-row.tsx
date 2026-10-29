import { TriangleAlert, X } from 'lucide-react-native';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, Icon, MoneyInput, TextInput } from '@/components';
import type { LineRowProps } from '../types';
import { AddAmountButton } from './add-amount-button';

/**
 * One line on Review bill: an editable name, an amount and a remove button. A line the bill had no
 * amount for shows the dashed Add in place of the amount field, and "Not found on the bill" under
 * the row while it is still empty. Tapping Add reveals the field and focuses it; it stays a field
 * once revealed, even if left empty. A line that had an amount keeps its field when the amount is
 * cleared, so the field is never swapped out while it is being typed in.
 */
export function LineRow({ control, index, label, onRemove }: LineRowProps) {
  const name = label.trim() || 'line';
  const cents = useWatch({ control, name: `lines.${index}.cents` });
  // Whether the bill named this line but gave it no amount, fixed when the row appears. A row the
  // user just added has no name yet, so it is a plain empty field, not a "not found" line.
  const [startedMissing] = useState(() => (cents === null || cents === undefined) && label.trim() !== '');
  const [adding, setAdding] = useState(false);
  const amountRef = useRef<ComponentRef<typeof MoneyInput>>(null);

  useEffect(() => {
    // The input library types this ref as the field's props; at runtime it is the TextInput.
    if (adding) (amountRef.current as { focus?: () => void } | null)?.focus?.();
  }, [adding]);

  const showField = !startedMissing || adding;
  const stillMissing = startedMissing && (cents === null || cents === undefined);

  return (
    <View className="gap-1">
      <View className="flex-row items-start gap-2">
        <TextInput
          placeholder="Field"
          fieldControlProps={{ control, name: `lines.${index}.label`, label: 'Field', className: 'min-w-0 flex-1' }}
        />
        {showField ? (
          <MoneyInput
            ref={amountRef}
            placeholder="0.00"
            fieldControlProps={{ control, name: `lines.${index}.cents`, label: 'Amount', className: 'w-28' }}
          />
        ) : (
          <View className="w-28 gap-1.5">
            <Text className="font-manrope-bold text-label text-on-surface">Amount</Text>
            <AddAmountButton lineName={name} onPress={() => setAdding(true)} />
          </View>
        )}
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
      {stillMissing ? (
        <View className="flex-row items-center gap-1 px-1">
          <Icon as={TriangleAlert} size={14} className="text-warning" />
          <Text className="font-manrope-semibold text-caption text-warning">Not found on the bill</Text>
        </View>
      ) : null}
    </View>
  );
}
