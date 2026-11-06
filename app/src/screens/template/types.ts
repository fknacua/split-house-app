import type { TemplateDialog, TemplateEditorResponse, TemplateKind, TemplatePreviewResponse } from '@splithouse/shared';

/** Props for {@link RemoveTemplateDialog}. */
export interface RemoveTemplateDialogProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /** The monthly breakdown or the nudge. */
  kind: TemplateKind;
  /** Whose custom template is removed. */
  personId: string;
  /** The dialog's text, written by the server. */
  dialog: TemplateDialog;
  /** Called by Cancel and the back gesture. */
  onClose: () => void;
  /** Called once the template is removed and the screens behind are refetched. */
  onRemoved: () => void;
}

/** Props for {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** The monthly breakdown or the nudge. */
  kind: TemplateKind;
  /** Whose custom template, new or saved, or null for the Default. */
  personId: string | null;
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
