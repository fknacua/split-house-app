import type {
  RecipientAction,
  RecipientAmountCard,
  RecipientMessage,
  RecipientMessageSection,
} from '@splithouse/shared';

/** Props for {@link AmountCard}. */
export interface AmountCardProps {
  /** The label, amount, chip and status line. */
  card: RecipientAmountCard;
}

/** Props for {@link MessageCard}. */
export interface MessageCardProps {
  /** The label, meta, preview parts, the text that is copied, and Edit template. */
  message: RecipientMessage;
}

/** Props for {@link MessageSection}. */
export interface MessageSectionProps {
  /** One person's lines, with the title and subtotal when the message has more than one person. */
  section: RecipientMessageSection;
}

/** Props for {@link RecipientFooter}. */
export interface RecipientFooterProps {
  /** A line above the buttons, or null. */
  note: string | null;
  /** The wide filled button, or null. */
  primary: RecipientAction | null;
  /** The outline buttons, side by side. */
  secondary: RecipientAction[];
}
