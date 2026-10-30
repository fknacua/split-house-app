import { Check, Plus, Send } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Alert, Button, SubpageFooter } from '@/components';
import { useOpenRecipientTarget } from '../use-open-recipient-target';
import type { RecipientFooterProps } from '../types';
import type { RecipientAction, RecipientTarget } from '@splithouse/shared';

const ICONS = { send: Send, check: Check, plus: Plus } as const;

// Buttons that open a chat and spin while it is recorded.
const SENDS = new Set<RecipientTarget['kind']>(['send-whatsapp', 'nudge-whatsapp', 'choose-nudge']);

/**
 * The sticky footer: an optional note, the danger Alert when a send failed, the wide filled button,
 * then the outline buttons side by side. A send button spins while its event is recorded.
 */
export function RecipientFooter({ note, primary, secondary, charges }: RecipientFooterProps) {
  const { openTarget, sending, sendError } = useOpenRecipientTarget(charges);
  const isSend = (action: RecipientAction) => SENDS.has(action.target.kind);

  return (
    <SubpageFooter>
      <View className="gap-2">
        {note ? (
          <Text className="px-1 font-manrope-semibold text-caption text-on-surface-variant">{note}</Text>
        ) : null}
        {sendError ? <Alert variant="danger" title="Error encountered" message={sendError} /> : null}
        {primary ? (
          <Button
            label={primary.label}
            icon={primary.icon ? ICONS[primary.icon] : undefined}
            disabled={!primary.enabled}
            loading={sending && isSend(primary)}
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
                loading={sending && isSend(action)}
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
