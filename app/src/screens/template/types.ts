import type { TemplateEditorResponse, TemplateKind, TemplatePreviewResponse } from '@splithouse/shared';

/** Props for {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** The monthly breakdown or the nudge. */
  kind: TemplateKind;
}

/** Props for {@link TemplateForm}. */
export interface TemplateFormProps {
  /** The loaded response. It fills the form when the form opens. */
  form: TemplateEditorResponse;
}

/** Props for {@link PlaceholderChips}. */
export interface PlaceholderChipsProps {
  /** The chips, e.g. `{name}`. */
  placeholders: string[];
  /** Called with the tapped chip. */
  onInsert: (placeholder: string) => void;
}

/** Props for {@link PreviewCard}. */
export interface PreviewCardProps {
  /** The server's latest answer, or undefined until the first one arrives. */
  answer: TemplatePreviewResponse | undefined;
}
