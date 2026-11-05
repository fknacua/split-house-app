import type { SettingsMessageRow } from '@splithouse/shared';

/** Props for {@link AccountCard}. */
export interface AccountCardProps {
  /** The signed-in email, or undefined until the screen has loaded. */
  email: string | undefined;
  /** The screen is still loading, so the email line shows a skeleton. */
  loading: boolean;
}

/** Props for {@link MessagesSection}. */
export interface MessagesSectionProps {
  /** The Messages rows, or undefined until the screen has loaded. */
  rows: SettingsMessageRow[] | undefined;
}

/** Props for {@link MessageRow}. */
export interface MessageRowProps {
  /** The template to draw. */
  row: SettingsMessageRow;
  /** Draws the separator above the row. False for the first row of a card. */
  separated: boolean;
}
