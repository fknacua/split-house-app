import type { AddChargeConfirm, AddChargePreview, AddChargeSheet, AddChargeValues } from '@splithouse/shared';

/** What a screen can call on an {@link AddChargeSheet} through its ref. */
export interface AddChargeSheetRef {
  /**
   * Slides the sheet up, fetched fresh, with every field as it opens.
   * @param chargeId Opens it as `Add correction` on this paid charge (Charge details); left out, Home's Add charge.
   */
  open: (chargeId?: string) => void;
  /** Slides the sheet down. */
  close: () => void;
}

/** The fields that show an error once they have been left empty or invalid. */
export interface AddChargeTouched {
  label: boolean;
  amount: boolean;
  dueDate: boolean;
}

/** Props for {@link SplitPreview}. */
export interface SplitPreviewProps {
  preview: NonNullable<AddChargePreview['preview']>;
}

/** Props for {@link CustomAmounts}. */
export interface CustomAmountsProps {
  /** The fields with the amount each shows: typed, or the Equal split while nothing is typed. */
  custom: NonNullable<AddChargePreview['custom']>;
  disabled: boolean;
  onChange: (personId: string, amountCents: number | null) => void;
}

/** Props for {@link ShareFields}. */
export interface ShareFieldsProps {
  /** The fields with the shares each shows: changed, or the household's. */
  shares: NonNullable<AddChargePreview['shares']>;
  disabled: boolean;
  onChange: (personId: string, shares: number | null) => void;
}

/** Props for {@link AddChargeConfirmDialog}. */
export interface AddChargeConfirmDialogProps {
  open: boolean;
  /** The dialog's text for the fields; null while Save is disabled. */
  confirm: AddChargeConfirm | null;
  saving: boolean;
  onConfirm: () => void;
  onGoBack: () => void;
}

/** Props for {@link DiscardChargeDialog}. */
export interface DiscardChargeDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/** Props for {@link AddChargeSkeleton}. */
export interface AddChargeSkeletonProps {
  /** Opened from a charge: Correction mode's fields, not Charge mode's. */
  correction: boolean;
}

/** Props for {@link LockedField}. */
export interface LockedFieldProps {
  /** The picked value, e.g. `Oct 2026`. */
  value: string;
  /** The field's name, read with the value. */
  accessibilityLabel: string;
}

/** Props for {@link CorrectionFields}. */
export interface CorrectionFieldsProps {
  /** Correction mode's Selects from the server. */
  selects: AddChargeSheet['correction'];
  /** The fields as they stand. */
  values: AddChargeValues;
  /** Correction mode's part of the preview. */
  preview: NonNullable<AddChargePreview['correction']>;
  disabled: boolean;
  /** A tap previews at once; typing waits for a pause. */
  onChange: (values: AddChargeValues, tap: boolean) => void;
}
