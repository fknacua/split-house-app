import { useState } from 'react';
import { Linking } from 'react-native';

import { useRecordMessageEvent } from '@/hooks';
import { useRecipientSheets } from './recipient-sheets';
import type { CreateMessageEventRequest, RecipientChargeRow, RecipientTarget } from '@splithouse/shared';

/** Shown when the chat can't be opened; nothing is recorded then. */
const CANT_OPEN_WHATSAPP = 'WhatsApp couldn’t be opened. No message is sent.';

/**
 * How Recipient opens what a button points at. Send on WhatsApp, Send again and Nudge open the
 * person's chat with the message typed in, one person at a time and only on a tap, then record that
 * it was opened (a nudge on its charge). Nudge again with no chosen charge first asks which one.
 * Mark paid opens Record payment with the person, and the charge when given, chosen, and Edit
 * payment opens the payment sheet on a paid charge, and Share bill the Share bill sheet
 * (`RecipientSheetsProvider`). Edit template (9A) and Add correction (Phase 11) do nothing until
 * their steps.
 *
 * @param charges - The screen's charge rows; the overdue ones are offered when Nudge again asks which.
 * @returns `openTarget`, which opens a target; `sending`, true while a send is being recorded; and
 *   `sendError`, the message for the danger Alert when the chat could not be opened or recorded.
 */
export function useOpenRecipientTarget(charges: RecipientChargeRow[] = []) {
  const { openRecordPayment, openChooseNudge, openEditPayment, openShareBill } = useRecipientSheets();
  const recordEvent = useRecordMessageEvent();
  const [sendError, setSendError] = useState<string | null>(null);

  const openChat = async (
    target: { url: string | null; month: string; personId: string },
    event: CreateMessageEventRequest
  ) => {
    if (!target.url) return;
    setSendError(null);
    try {
      await Linking.openURL(target.url);
    } catch {
      setSendError(CANT_OPEN_WHATSAPP);
      return;
    }
    recordEvent.mutate(
      { month: target.month, personId: target.personId, event },
      { onError: (error) => setSendError(error.message) }
    );
  };

  const openTarget = (target: RecipientTarget): void => {
    switch (target.kind) {
      case 'send-whatsapp':
        void openChat(target, { kind: 'MONTHLY' });
        return;
      case 'nudge-whatsapp':
        void openChat(target, { kind: 'NUDGE', chargeId: target.chargeId });
        return;
      case 'choose-nudge':
        openChooseNudge(
          charges.filter((row) => row.nudge !== null),
          (row) => row.nudge && openTarget(row.nudge)
        );
        return;
      case 'record-payment':
        openRecordPayment(target.month, target.personId, target.chargeId);
        return;
      case 'edit-payment':
        openEditPayment(target.chargeId, target.charges);
        return;
      case 'share-bill':
        openShareBill(target.month);
        return;
      case 'edit-template': // 9A
      case 'add-correction': // Phase 11
        return;
    }
  };

  return { openTarget, sending: recordEvent.isPending, sendError };
}
