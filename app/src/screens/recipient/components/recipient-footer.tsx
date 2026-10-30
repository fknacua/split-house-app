import { Check, Plus, Send } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, SubpageFooter } from '@/components';
import { useOpenRecipientTarget } from '../use-open-recipient-target';
import type { RecipientFooterProps } from '../types';

const ICONS = { send: Send, check: Check, plus: Plus } as const;

/** The sticky footer: an optional note, the wide filled button, then the outline buttons side by side. */
export function RecipientFooter({ note, primary, secondary }: RecipientFooterProps) {
  const { openTarget } = useOpenRecipientTarget();

  return (
    <SubpageFooter>
      <View className="gap-2">
        {note ? (
          <Text className="px-1 font-manrope-semibold text-caption text-on-surface-variant">{note}</Text>
        ) : null}
        {primary ? (
          <Button
            label={primary.label}
            icon={primary.icon ? ICONS[primary.icon] : undefined}
            disabled={!primary.enabled}
            onPress={() => openTarget(primary.target)}
          />
        ) : null}
        {secondary.length > 0 ? (
          <View className="flex-row gap-2">
            {secondary.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                variant="outline"
                icon={action.icon ? ICONS[action.icon] : undefined}
                disabled={!action.enabled}
                onPress={() => openTarget(action.target)}
                className="flex-1"
              />
            ))}
          </View>
        ) : null}
      </View>
    </SubpageFooter>
  );
}
