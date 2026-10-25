import type { HomeAction, HomeHero, HomePrimaryAction, HomeRow, HomeStep } from '@splithouse/shared';

/** Props for {@link HomeHero}. */
export interface HomeHeroProps {
  /** The hero card's text and progress. */
  hero: HomeHero;
}

/** Props for {@link HomeSteps}. */
export interface HomeStepsProps {
  /** The three month steps. */
  steps: HomeStep[];
  /** Draws the compact bar: no check marks on done steps. */
  compact?: boolean;
}

/** Props for {@link HomeTile}. */
export interface HomeTileProps {
  /** Small line above the value, e.g. `You’re fronting`. */
  label: string;
  /** The figure, e.g. `$3,602.50`. */
  value: string;
}

/** Props for {@link HomeCompactSummary}. */
export interface HomeCompactSummaryProps {
  /** The hero card's text and progress. */
  hero: HomeHero;
}

/** Props for {@link HomeCharges}. */
export interface HomeChargesProps {
  /** One row per charge, ordered by due date. */
  rows: HomeRow[];
}

/** Props for {@link HomeRowHeader} and {@link HomeRowContent}. */
export interface HomeRowProps {
  /** The row to draw. */
  row: HomeRow;
}

/** Props for {@link HomeActionButton}. */
export interface HomeActionButtonProps {
  /** The button's label, look and where it goes. */
  action: HomeAction;
}

/** Props for {@link HomeFooter}. */
export interface HomeFooterProps {
  /** The footer button. */
  action: NonNullable<HomePrimaryAction>;
}
