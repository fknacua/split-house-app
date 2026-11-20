import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { DEFAULT_FAILED_MESSAGE } from '@/components';
import { useRecordMessageEvent } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import type { SendWhatsappTarget } from '@splithouse/shared';

/** Shown when the chat can't be opened; nothing is recorded then. */
const CANT_OPEN_WHATSAPP = 'WhatsApp couldn’t be opened. No message is sent.';

/**
 * Sending on WhatsApp from the Send message sheet: opens the person's chat with the message typed in,
 * one chat at a time and only on a tap, never sending anything itself. Once the app is back in front,
 * `check` holds the send so the sheet can ask "Did you send the message?"; only "Yes, it was sent"
 * records it, with the body the server put on the target. "Not yet" records nothing.
 *
 * @returns `send`, which opens the chat; `error`, the message for the sheet's danger Alert when it
 *   couldn't open; `check`, the send waiting for an answer; `confirm` and `notYet`, the answers;
 *   `saving` and `recordError` for the dialog; and `reset`, which clears all of it as the sheet opens.
 */
export function useWhatsappSend() {
  const record = useRecordMessageEvent();
  // Set before the chat opens, so returning to the app always finds it.
  const pending = useRef<SendWhatsappTarget | null>(null);
  const [check, setCheck] = useState<SendWhatsappTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active' && pending.current) {
        setCheck(pending.current);
        pending.current = null;
      }
      previous = next;
    });
    return () => subscription.remove();
  }, []);

  const send = async (target: SendWhatsappTarget) => {
    setError(null);
    pending.current = target;
    try {
      await Linking.openURL(target.url);
    } catch {
      pending.current = null;
      setError(CANT_OPEN_WHATSAPP);
    }
  };

  // Awaited rather than a per-call `onSuccess`, which TanStack skips when its observer is not listening.
  const confirm = async () => {
    if (!check) return;
    try {
      await record.mutateAsync({ month: check.month, personId: check.personId, event: check.record });
    } catch {
      return; // The dialog stays open and shows `recordError`.
    }
    setCheck(null);
  };

  const notYet = () => {
    record.reset();
    setCheck(null);
  };

  const reset = () => {
    pending.current = null;
    record.reset();
    setError(null);
  };

  const recordError = record.error
    ? record.error instanceof ApiRequestError
      ? record.error.message
      : DEFAULT_FAILED_MESSAGE
    : null;

  return { send, error, check, confirm, notYet, saving: record.isPending, recordError, reset };
}
