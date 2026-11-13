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
  /** Nudge or Nudge again, then Mark paid. The footer is not shown when empty. */
  actions: HomeAction[];
}
