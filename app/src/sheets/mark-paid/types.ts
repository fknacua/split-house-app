import type { RecordPaymentConfirm, RecordPaymentSheet } from '@splithouse/shared';

/** How Record payment opens: nobody picked (Home's footer) or on a charge (Mark paid). */
export interface RecordPaymentOpening {
  /** The charge Mark paid was tapped on: its payer is picked and it is ticked. */
  chargeId?: string;
}

/** What a screen can call on a {@link RecordPaymentSheet} through its ref. */
export interface RecordPaymentSheetRef {
  /** Slides the sheet up, fetched fresh, as `opening` says. */
  open: (opening?: RecordPaymentOpening) => void;
  /** Slides the sheet down. */
  close: () => void;
}

/** Props for {@link FromField}. */
export interface FromFieldProps {
  from: RecordPaymentSheet['from'];
  /** Who is picked now, or null; follows a pick before the sheet refetches. */
  value: string | null;
  disabled: boolean;
  onChange: (personId: string) => void;
}

/** Props for {@link ForField}. */
export interface ForFieldProps {
  for: RecordPaymentSheet['for'];
  disabled: boolean;
  /** Ticks or unticks one charge. */
  onToggle: (chargeId: string) => void;
  /** Select all: ticks every charge, or clears them once all are ticked. */
  onToggleAll: () => void;
}

/** Props for {@link AmountField}. */
export interface AmountFieldProps {
  amount: RecordPaymentSheet['amount'];
  /** True while something is ticked, so the amount reads in full colour. */
  hasTicks: boolean;
  disabled: boolean;
}

/** Props for {@link SettledCard}. */
export interface SettledCardProps {
  settled: NonNullable<RecordPaymentSheet['settled']>;
}

/** Props for {@link RecordConfirmDialog}. */
export interface RecordConfirmDialogProps {
  open: boolean;
  /** The dialog's text for the ticked charges; null while nothing is ticked. */
  confirm: RecordPaymentConfirm | null;
  /** The Received on row's value, as the date field shows it, e.g. `3 Nov 2026`. */
  receivedOn: string;
  saving: boolean;
  onConfirm: () => void;
  onGoBack: () => void;
}

/** Props for {@link ConfirmDetailRow}. */
export interface ConfirmDetailRowProps {
  label: string;
  value: string;
  /** The first row has no divider above it. */
  first?: boolean;
}

/** Props for {@link DiscardPaymentDialog}. */
export interface DiscardPaymentDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}
