import type { ReactNode } from 'react';

import type { ChargeDetailsActivity, ChargeDetailsFact, ChargeDetailsResponse, HomeAction } from '@splithouse/shared';

/** Props for {@link Section}. */
export interface SectionProps {
  /** The bold heading above the card, e.g. `Details`. */
  title: string;
  children: ReactNode;
}

/** Props for {@link AmountCard}. */
export interface AmountCardProps {
  /** The amount, its chip and the optional note. */
  amount: ChargeDetailsResponse['amount'];
}

/** Props for {@link DetailsCard}. */
export interface DetailsCardProps {
  /** Payer, Payment routing, Due and Payment status, in order. */
  facts: ChargeDetailsFact[];
}

/** Props for {@link ActivityCard}. */
export interface ActivityCardProps {
  /** Newest first; empty shows `No activity yet`. */
  activity: ChargeDetailsActivity[];
}

/** Props for {@link ChargeDetailsFooter}. */
export interface ChargeDetailsFooterProps {
  /** Nudge or Nudge again, then Mark paid; Edit payment and Add correction; Delete correction last. The footer is not shown when empty. */
  actions: HomeAction[];
  /** The charge the page shows. */
  chargeId: string;
  /** The `Delete this correction?` dialog's text; null for any other charge. */
  deleteCorrection: ChargeDetailsResponse['deleteCorrection'];
}

/** Props for {@link DeleteCorrectionDialog}. */
export interface DeleteCorrectionDialogProps {
  open: boolean;
  /** The dialog's text from the server. */
  confirm: NonNullable<ChargeDetailsResponse['deleteCorrection']>;
  deleting: boolean;
  /** The failed delete's message; undefined while there is none. */
  error?: string;
  onKeep: () => void;
  onDelete: () => void;
}
