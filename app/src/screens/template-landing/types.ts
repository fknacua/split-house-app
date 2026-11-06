import type { ReactNode } from 'react';

import type { TemplateCustomCard, TemplateKind, TemplateLandingResponse } from '@splithouse/shared';

/** Props for {@link TemplateLanding}. */
export interface TemplateLandingProps {
  /** The monthly breakdown or the nudge. */
  kind: TemplateKind;
}

/** Props for {@link LandingContent}. */
export interface LandingContentProps {
  /** The loaded landing page. */
  landing: TemplateLandingResponse;
  /** Opens the editor on the Default (null) or one person's custom template. */
  onEdit: (personId: string | null) => void;
  /** Opens the For who sheet. */
  onAdd: () => void;
}

/** Props for {@link SectionHeading}. */
export interface SectionHeadingProps {
  /** e.g. `Default`. */
  title: string;
  /** The line under the title, e.g. `What everyone else gets`. */
  sub?: string;
  /** The link button on the right, if any. */
  action?: ReactNode;
}

/** Props for {@link DefaultSection}. */
export interface DefaultSectionProps {
  /** The Default's title, sub and preview. */
  section: TemplateLandingResponse['default'];
  /** Opens the editor on the Default. */
  onEdit: () => void;
}

/** Props for {@link CustomSection}. */
export interface CustomSectionProps {
  /** The Custom templates title, whether Add more is allowed, and the cards. */
  section: TemplateLandingResponse['custom'];
  /** Opens the editor on one person's custom template. */
  onEdit: (personId: string) => void;
  /** Opens the For who sheet. */
  onAdd: () => void;
}

/** Props for {@link CustomTemplateCard}. */
export interface CustomTemplateCardProps {
  /** The person and their rendered template. */
  card: TemplateCustomCard;
  /** Opens the editor on this custom template. */
  onEdit: () => void;
}

/** Props for {@link ForWhoSheet}. */
export interface ForWhoSheetProps {
  /** The sheet's title and everyone without a custom template. */
  forWho: TemplateLandingResponse['forWho'];
  /** Called with the tapped person. */
  onChoose: (personId: string) => void;
}
