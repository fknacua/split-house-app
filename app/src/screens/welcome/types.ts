import type { SetupAction, SetupResponse, SetupRow, SetupTarget } from '@splithouse/shared';

/** Opens a Welcome target. */
export type OpenSetupTarget = (target: SetupTarget) => void;

/** Props for {@link WelcomeHeader}. */
export interface WelcomeHeaderProps {
  heading: SetupResponse['heading'];
  intro: SetupResponse['intro'];
  /** Null until a step is done: then no progress bar shows. */
  progress: SetupResponse['progress'];
}

/** Props for {@link WelcomeRow}. */
export interface WelcomeRowProps {
  /** The step to draw. */
  row: SetupRow;
  /** Draws the separator above the row. False for the first row of the card. */
  separated: boolean;
  onOpen: OpenSetupTarget;
}

/** Props for {@link StepDot}. */
export interface StepDotProps {
  /** The step's number, shown while it is not done. */
  number: string;
  state: SetupRow['state'];
}

/** Props for {@link WelcomeFooter}. */
export interface WelcomeFooterProps {
  primary: SetupAction;
  /** `Not now` in `optional`; null for none. */
  secondary: SetupAction | null;
  onOpen: OpenSetupTarget;
  /**
   * The target running on the server, `skip-step` or `finish`: its button shows the spinner and the other is
   * disabled. Null when none is.
   */
  pending: Extract<SetupTarget['kind'], 'skip-step' | 'finish'> | null;
  /** A failed skip's or finish's message, shown above the buttons; null for none. */
  error: string | null;
}
