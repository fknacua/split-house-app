import type { AddChargeConfirm, AddChargePreview } from '@splithouse/shared';

/** What a screen can call on an {@link AddChargeSheet} through its ref. */
export interface AddChargeSheetRef {
  /** Slides the sheet up, fetched fresh, with every field as it opens. */
  open: () => void;
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
