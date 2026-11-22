import type { EditPaymentSheet } from '@splithouse/shared';

/** What a screen can call on an {@link EditPaymentSheet} through its ref. */
export interface EditPaymentSheetRef {
  /** Slides the sheet up for one paid charge, fetched fresh. */
  open: (chargeId: string) => void;
  /** Slides the sheet down. */
  close: () => void;
}

/** Props for {@link PaymentRows}. */
export interface PaymentRowsProps {
  /** From, For and Amount received, as the server writes them. */
  rows: EditPaymentSheet['rows'];
}

/** Props for {@link RemovePaymentDialog}. */
export interface RemovePaymentDialogProps {
  open: boolean;
  /** The dialog's text from the server. */
  confirm: EditPaymentSheet['remove']['confirm'] | null;
  /** The removal is in progress: the dialog can't be left. */
  removing: boolean;
  /** A failed removal's message; the dialog stays open so it can be tried again. */
  error?: string;
  onKeep: () => void;
  onRemove: () => void;
}

/** Props for {@link DiscardEditDialog}. */
export interface DiscardEditDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}
