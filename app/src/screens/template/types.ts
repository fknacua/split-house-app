import type { Control } from 'react-hook-form';
import type { TextInputProps } from 'react-native';

import type {
  TemplateDialog,
  TemplateEditorResponse,
  TemplateKind,
  TemplatePreviewResponse,
} from '@splithouse/shared';
import type { TemplateFormValues } from './helpers';

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

/** Props for {@link RestoreTemplateDialog}. */
export interface RestoreTemplateDialogProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /** The monthly breakdown or the nudge, whose Default is restored. */
  kind: TemplateKind;
  /** The dialog's text, written by the server. */
  dialog: TemplateDialog;
  /** Called by Cancel and the back gesture. */
  onClose: () => void;
  /** Called once the Default is restored and the screens behind, the editor included, are refetched. */
  onRestored: () => void;
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
  /** Called once the Default is restored, so the editor reopens on the restored text. */
  onRestored: () => void;
}

/** Props for {@link MessageField}. */
export interface MessageFieldProps {
  /** The form's `control`; the field is `text`. */
  control: Control<TemplateFormValues>;
  /** `Restore to original`, or undefined when the Default has nothing to restore. */
  restoreLabel?: string;
  /** Opens the restore dialog. */
  onRestore?: () => void;
  /** Disables the restore link while saving. */
  disabled?: boolean;
  /** Sets the cursor. Leave undefined to let the user move it. */
  selection?: TextInputProps['selection'];
  /** Called when the cursor moves or the selected text changes. */
  onSelectionChange?: TextInputProps['onSelectionChange'];
}

/** Props for {@link PlaceholderChips}. */
export interface PlaceholderChipsProps {
  /** The chips, e.g. `{name}`. */
  placeholders: string[];
  /** Called with the tapped chip. */
  onInsert: (placeholder: string) => void;
}

/** Props for {@link LineLabelsSheet}. */
export interface LineLabelsSheetProps {
  /** The latest saved labels; the sheet refills from them each time it opens. */
  labels: TemplateEditorResponse['labels'];
}

/** The Section labels card and sheet's content, from the editor response. */
export type SectionLabelsBlock = NonNullable<TemplateEditorResponse['sectionLabels']>;

/** The section labels by person, without the colon; empty for the usual one. */
export type SectionLabels = Record<string, string>;

/** Props for {@link SectionLabelsCard}. */
export interface SectionLabelsCardProps {
  /** The latest saved labels. */
  block: SectionLabelsBlock;
  /** Disables `Edit` while the template saves. */
  disabled?: boolean;
  /** Opens the Section labels sheet. */
  onEdit: () => void;
}

/** Props for {@link SectionLabelsSheet}. */
export interface SectionLabelsSheetProps {
  /** Whose message the labels are for: the person whose custom template this is. */
  recipientId: string;
  /** The latest saved labels; the sheet refills from them each time it opens. */
  block: SectionLabelsBlock;
}

/** Props for {@link PreviewCard}. */
export interface PreviewCardProps {
  /** The server's latest answer, or undefined until the first one arrives. */
  answer: TemplatePreviewResponse | undefined;
  /** Disables `Edit line labels` while saving. */
  editLabelsDisabled?: boolean;
  /** Opens the Line labels sheet. */
  onEditLabels: () => void;
}
