import type { Control } from 'react-hook-form';
import type { TemplateFormResponse, TemplateKind, TemplatePreviewResponse } from '@splithouse/shared';
import type { TemplateFormValues } from './helpers';

/** Props for {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** The monthly breakdown or the nudge. */
  kind: TemplateKind;
}

/** Props for {@link TemplateForm}. */
export interface TemplateFormProps {
  /** The loaded response. It fills the form when the form opens. */
  form: TemplateFormResponse;
}

/** Props for {@link AppliesToField}. */
export interface AppliesToFieldProps {
  appliesTo: TemplateFormResponse['appliesTo'];
  /** The person loaded, or null for Everyone. */
  personId: string | null;
}

/** Props for {@link PlaceholderChips}. */
export interface PlaceholderChipsProps {
  /** The chips, e.g. `{name}`. */
  placeholders: string[];
  /** Called with the tapped chip. */
  onInsert: (placeholder: string) => void;
}

/** Props for {@link LineLabelsSection}. */
export interface LineLabelsSectionProps {
  lineLabels: TemplateFormResponse['lineLabels'];
  control: Control<TemplateFormValues>;
  /** The server's messages by request field name. */
  errors: Record<string, string>;
}

/** Props for {@link PreviewCard}. */
export interface PreviewCardProps {
  /** The server's latest answer, or undefined until the first one arrives. */
  answer: TemplatePreviewResponse | undefined;
}

/** Props for {@link NudgePreviewCard}. */
export interface NudgePreviewCardProps extends PreviewCardProps {
  /** Who the preview can show. */
  samples: TemplateFormResponse['samples'];
  /** Who it shows, or null with no samples. */
  samplePersonId: string | null;
  /** Called with the tapped sample's person. */
  onSampleChange: (personId: string) => void;
}
