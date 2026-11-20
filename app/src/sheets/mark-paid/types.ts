import type { ReactNode } from 'react';
import type {
  ChargePaymentResponse,
  PaymentDifference,
  RecipientPaidCharge,
  RecordPaymentConfirm,
  RecordPaymentSheet,
} from '@splithouse/shared';

/** The word the button uses for an amount that differs: Edit payment's `Save $X`. */
export type PaymentVerb = 'Save' | 'Record';

/** What the amount field and the button show for the amount typed so far. */
export interface AmountState {
  /** Under the amount field: the hint, or `null` while the amount differs (the Alert says it). */
  helper: string | null;
  /** The save button: the sheet's label, or `Save $X` while the amount differs. */
  actionLabel: string;
  /** The shortfall or overpayment for the info Alert, or `null` for none. */
  difference: PaymentDifference | null;
}

/** Props for {@link PaymentSheet}. */
export interface PaymentSheetProps {
  /** The charge's sheet, or null while it loads. */
  sheet: ChargePaymentResponse | null;
  /** The load's error; a refusal from the server shows its message in a danger Alert. */
  loadError: unknown;
  /** The button's word while the amount differs. */
  verb: PaymentVerb;
  /** The title while the sheet loads. */
  fallbackTitle: string;
  /** The button while the sheet loads. */
  fallbackActionLabel: string;
  /** Fields above the summary, such as Edit payment's For. */
  renderFields?: (state: { saving: boolean }) => ReactNode;
}

/** Props for {@link PaymentSummary}. */
export interface PaymentSummaryProps {
  /** The sheet, or null while it loads. */
  sheet: ChargePaymentResponse | null;
}

/** Props for {@link EditPaymentSheet}. */
export interface EditPaymentSheetProps {
  /** The payment to open on: the one that differs, else the first. */
  chargeId: string;
  /** The person's paid charges; with two or more, a For list picks which payment to edit. */
  charges: RecipientPaidCharge[];
}

/** How Record payment opens: nobody picked (Home's footer), a person (Recipient) or a charge (Mark paid). */
export interface RecordPaymentOpening {
  /** Who is picked in From, with nothing ticked. */
  personId?: string;
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
