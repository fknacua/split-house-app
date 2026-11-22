import { Bell, Check, Pencil } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';

import { Button, SubpageFooter } from '@/components';
import { RecordPaymentSheet, type RecordPaymentSheetRef } from '@/sheets/mark-paid';
import { SendMessageSheet, type SendMessageSheetRef } from '@/sheets/send-message';
import type { HomeTarget } from '@splithouse/shared';
import type { ChargeDetailsFooterProps } from '../types';

const ICONS = { check: Check, bell: Bell, pencil: Pencil } as const;

/**
 * The sticky footer: Nudge or Nudge again above Mark paid, as the server sends them. Mark paid opens
 * Record payment with this charge ticked; Nudge opens the nudge sheet for the payer with this charge
 * ticked. After a save or a recorded nudge the page refetches in place.
 */
export function ChargeDetailsFooter({ actions }: ChargeDetailsFooterProps) {
  const recordPayment = useRef<RecordPaymentSheetRef>(null);
  const sendMessage = useRef<SendMessageSheetRef>(null);

  const openTarget = (target: HomeTarget) => {
    switch (target.kind) {
      case 'mark-paid':
        recordPayment.current?.open({ chargeId: target.chargeId });
        return;
      case 'send-nudge':
        sendMessage.current?.open({ mode: 'nudge', personId: target.personId, chargeId: target.chargeId });
        return;
      default:
        // Edit payment opens its sheet from 13A.2; Charge details sends nothing else.
        return;
    }
  };

  return (
    <>
      <SubpageFooter>
        <View className="gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.tone}
              icon={action.icon ? ICONS[action.icon] : undefined}
              onPress={() => openTarget(action.target)}
            />
          ))}
        </View>
      </SubpageFooter>
      <RecordPaymentSheet ref={recordPayment} />
      <SendMessageSheet ref={sendMessage} />
    </>
  );
}
