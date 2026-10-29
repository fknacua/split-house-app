import type {
  BillViewCollection,
  BillViewFact,
  BillViewFile,
  BillViewHero,
  BillViewPerson,
} from '@splithouse/shared';

/** Props for {@link BillHeroCard}. */
export interface BillHeroCardProps {
  /** Current Charges, its chip and the bill's lines. */
  hero: BillViewHero;
}

/** Props for {@link CollectionCard}. */
export interface CollectionCardProps {
  /** How much is collected, and a row per person. */
  collection: BillViewCollection;
}

/** Props for {@link PersonRow}. */
export interface PersonRowProps {
  /** The person's share to draw. */
  person: BillViewPerson;
}

/** Props for {@link FactsCard}. */
export interface FactsCardProps {
  /** Label and value rows, top to bottom. */
  facts: BillViewFact[];
}

/** Props for {@link FileRow}. */
export interface FileRowProps {
  /** The stored PDF's name and meta line. */
  file: BillViewFile;
}
