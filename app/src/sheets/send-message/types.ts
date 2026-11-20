import type { ReactNode } from 'react';

import type {
  BadgeContent,
  SendChargesCard,
  SendHistory,
  SendMessageCard,
  SendMode,
  SendResponse,
  SendTotalCard,
  SendWhatsappTarget,
} from '@splithouse/shared';

/** How the Send message sheet opens: the mode, who is picked, and in nudge mode the tapped charge. */
export interface SendMessageOpening {
  mode: SendMode;
  /** Who is picked in To; left out, nobody is. */
  personId?: string;
  /** Nudge mode: the tapped charge, ticked as the sheet opens. */
  chargeId?: string;
}

/** What a screen can call on a {@link SendMessageSheet} through its ref. */
export interface SendMessageSheetRef {
  /** Slides the sheet up, fetched fresh, as `opening` says. */
  open: (opening: SendMessageOpening) => void;
  /** Slides the sheet down. */
  close: () => void;
}

/** Props for {@link ToField}. */
export interface ToFieldProps {
  to: SendResponse['to'];
  /** Who is picked now, or null; follows a pick before the sheet refetches. */
  value: string | null;
  onChange: (personId: string) => void;
}

/** Props for {@link FieldCard}. */
export interface FieldCardProps {
  /** e.g. `Total` or `Overdue charges`. */
  label: string;
  children: ReactNode;
}

/** Props for {@link CardHeader}. */
export interface CardHeaderProps {
  /** e.g. `$X,XXX.XX`. */
  amount: string;
  /** The caption lines under the amount; null ones are left out. */
  lines: (string | null)[];
  chip: BadgeContent | null;
  /** Null for a card that doesn't open: no chevron, and no tap. */
  open: boolean | null;
  onToggle?: () => void;
}

/** Props for {@link TotalCard}. */
export interface TotalCardProps {
  total: SendTotalCard;
}

/** Props for {@link ChargesCard}. */
export interface ChargesCardProps {
  charges: SendChargesCard;
  /** Ticks or unticks one charge. */
  onToggle: (chargeId: string) => void;
}

/** Props for {@link HistoryCard}. */
export interface HistoryCardProps {
  history: SendHistory;
}

/** Props for {@link SendMessageCard}. */
export interface SendMessageCardProps {
  message: SendMessageCard;
  /** Opens the template editor the card's Edit template points at. */
  onEditTemplate: () => void;
}

/** Props for {@link SendFooter}. */
export interface SendFooterProps {
  /** e.g. `No WhatsApp number is set up for Jordan.`, above the buttons; null for none. */
  note: string | null;
  /** `Send on WhatsApp`, `Send again` or `Nudge again`. */
  sendLabel: string;
  sendDisabled: boolean;
  onSend: () => void;
  shareLabel: string;
  shareDisabled: boolean;
  onShare: () => void;
}

/** Props for {@link SentCheckDialog}. */
export interface SentCheckDialogProps {
  /** The send waiting for an answer, or null while the dialog is closed. */
  check: SendWhatsappTarget | null;
  saving: boolean;
  /** Why recording failed, or null. */
  error: string | null;
  onConfirm: () => void;
  onNotYet: () => void;
}
