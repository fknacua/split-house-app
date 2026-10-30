import type { RecipientTarget } from '@splithouse/shared';

/**
 * How Recipient opens what a button points at. Every target here opens something a later step
 * builds, so each does nothing until then: Send on WhatsApp (7.7), Share bill (7.10) and Edit
 * template (9A).
 *
 * @returns `openTarget`, which opens a target.
 */
export function useOpenRecipientTarget() {
  const openTarget = (target: RecipientTarget): void => {
    switch (target.kind) {
      case 'send-whatsapp': // 7.7
      case 'share-bill': // 7.10
      case 'edit-template': // 9A
        return;
    }
  };

  return { openTarget };
}
