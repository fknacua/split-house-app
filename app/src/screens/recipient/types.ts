import type {
  RecipientAction,
  RecipientAmountCard,
  RecipientChargeRow,
  RecipientMessage,
  RecipientMessageSection,
} from '@splithouse/shared';

/** Props for {@link ChargeRow}. */
export interface ChargeRowProps {
  /** The title, amount, detail and chip. */
  row: RecipientChargeRow;
  /** The first row has no rule above it. */
  first: boolean;
  /** Makes the row a button (the Nudge about which charge? sheet). */
  onPress?: () => void;
}

/** Props for {@link ChargeRowsCard}. */
export interface ChargeRowsCardProps {
  /** The person's unpaid charges, by due date. */
  rows: RecipientChargeRow[];
}

/** Props for {@link NudgeChargeSheet}. */
export interface NudgeChargeSheetProps {
  /** The overdue charges, each with its nudge. */
  rows: RecipientChargeRow[];
  /** Called with the tapped row. */
  onChoose: (row: RecipientChargeRow) => void;
}

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
  /** The charge rows, for Nudge again's which-charge sheet. */
  charges: RecipientChargeRow[];
}
