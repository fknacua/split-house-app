import type { ReactNode } from 'react';

import type {
  HouseholdSplitAmount,
  HouseholdSplitCountAmount,
  HouseholdSplitFormResponse,
  HouseholdSplitRoomRow,
  PersonColor,
} from '@splithouse/shared';

/** Props for {@link SplitForm}. */
export interface SplitFormProps {
  /** The loaded response. It fills the form when the form opens. */
  form: HouseholdSplitFormResponse;
}

/** Props for {@link SplitCard}. */
export interface SplitCardProps {
  /** e.g. `Rent (SGD)`. */
  title: string;
  /** The tenant rows, above the card's calculated line. */
  children: ReactNode;
  /** e.g. `Shared rent`. */
  leftLabel: string;
  /** What is left to split. */
  left: string;
  /** A second calculated line, such as `Total units`. */
  total?: { label: string; value: string };
  /** A message that belongs to the whole card, under the rows. */
  error?: string;
  /** The split control, or nothing with no primary tenant. */
  split: ReactNode;
}

/** Props for {@link RoomRow}. */
export interface RoomRowProps {
  row: HouseholdSplitRoomRow;
}

/** Props for {@link NumberRow}. */
export interface NumberRowProps {
  /** e.g. `Sam`, `Total shares`. */
  label: string;
  /** The dot before the label. Null for a row that belongs to nobody. */
  color: PersonColor | null;
  /** In thousandths of a share, or null while empty. */
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  warning?: string;
}

/** Props for {@link FieldMessage}. */
export interface FieldMessageProps {
  error?: string;
  /** Shown only when there is no error. */
  warning?: string;
  /** Lines the message up on the right, under a row's input. */
  alignEnd?: boolean;
}

/** Props for {@link SplitControl}. */
export interface SplitControlProps {
  /** e.g. `Split between you and Priya`. */
  title: string;
  /** What the slider sets, e.g. `Rent (SGD)`. */
  cardTitle: string;
  owner: HouseholdSplitFormResponse['owner'];
  primary: NonNullable<HouseholdSplitFormResponse['primary']>;
  /** The form's basis points, or null while a field is empty. */
  bps: number | null;
  /** The saved basis points, where the slider rests while a field is empty. */
  savedBps: number;
  onChange: (bps: number | null) => void;
  /** Each person's part of what is left. */
  amount: HouseholdSplitAmount;
  error?: string;
  /** Someone is at 0, which still allows Save. */
  warning?: string;
}

/** Props for {@link CountSplitControl}. */
export interface CountSplitControlProps {
  /** e.g. `Split between you and Priya`. */
  title: string;
  /** What the slider sets, e.g. `Utilities (shares)`. */
  cardTitle: string;
  /** After each count: `shares` or `units`. */
  unit: string;
  owner: HouseholdSplitFormResponse['owner'];
  primary: NonNullable<HouseholdSplitFormResponse['primary']>;
  /** The primary tenant's typed count, null while empty, or undefined until one is typed. */
  typed: number | null | undefined;
  /** The server's counts for the values last answered. */
  counts: HouseholdSplitCountAmount['counts'];
  onChange: (primaryCount: number | null) => void;
  error?: string;
  /** Someone is at 0, which still allows Save. */
  warning?: string;
  /** Nothing is left to split, so the control is dimmed. */
  dimmed?: boolean;
}

/** Props for {@link SplitField}. */
export interface SplitFieldProps {
  /** `whole` for a percent, `shares` for a count. */
  kind: 'whole' | 'shares';
  /** After the value: `%`, `shares` or `units`. */
  suffix: string;
  name: string;
  color: PersonColor;
  value: number | null;
  onChange: (value: number | null) => void;
  /** What it comes to, e.g. `$X,XXX.XX`. Left out when the field is already the count. */
  amount?: string;
  invalid: boolean;
  /** Draws the amber border, for the person at 0. */
  warned: boolean;
}
