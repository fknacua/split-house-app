import { useState } from 'react';
import { Linking } from 'react-native';

import { useRecordMessageEvent } from '@/hooks';
import { useRecipientSheets } from './recipient-sheets';
import type { RecipientTarget } from '@splithouse/shared';

/** Shown when the chat can't be opened; nothing is recorded then. */
const CANT_OPEN_WHATSAPP = 'WhatsApp couldn’t be opened. No message is sent.';

/**
 * How Recipient opens what a button points at. Send on WhatsApp and Send again open the person's
 * chat with the message typed in, one person at a time and only on a tap, then record that it was
 * opened; Mark paid opens Record payment with the person chosen (`RecipientSheetsProvider`). Share
 * bill (7.10) and Edit template (9A) do nothing until their steps.
 *
 * @returns `openTarget`, which opens a target; `sending`, true while a send is being recorded; and
 *   `sendError`, the message for the danger Alert when the chat could not be opened or recorded.
 */
export function useOpenRecipientTarget() {
  const { openRecordPayment } = useRecipientSheets();
  const recordEvent = useRecordMessageEvent();
  const [sendError, setSendError] = useState<string | null>(null);

  const sendWhatsApp = async (target: Extract<RecipientTarget, { kind: 'send-whatsapp' }>) => {
    if (!target.url) return;
    setSendError(null);
    try {
      await Linking.openURL(target.url);
    } catch {
      setSendError(CANT_OPEN_WHATSAPP);
      return;
    }
    recordEvent.mutate(
      { month: target.month, personId: target.personId, event: { kind: 'MONTHLY' } },
      { onError: (error) => setSendError(error.message) },
    );
  };

  const openTarget = (target: RecipientTarget): void => {
    switch (target.kind) {
      case 'send-whatsapp':
        void sendWhatsApp(target);
        return;
      case 'record-payment':
        openRecordPayment(target.month, target.personId);
        return;
      case 'share-bill': // 7.10
      case 'edit-template': // 9A
        return;
    }
  };

  return { openTarget, sending: recordEvent.isPending, sendError };
}
