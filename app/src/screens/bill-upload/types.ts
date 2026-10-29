import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';

import type { BillDraftResponse } from '@splithouse/shared';
import type { PickedPdfProblem, ReviewFormValues } from './helpers';

/** Which board of Bill upload is showing. */
export type UploadStep = 'pick' | 'reading' | 'review';

/** Props for {@link FileCard}. */
export interface FileCardProps {
  filename: string;
  /** e.g. `2 pages · 214 KB`. Left out while the file is still uploading. */
  meta?: string;
  /** `large` on the reading board, `small` on Review bill. */
  size: 'large' | 'small';
  /** Drawn under the file row, such as the Spinner or Choose another file. */
  children?: ReactNode;
}

/** Props for {@link PickStep}. */
export interface PickStepProps {
  /** e.g. `November`. */
  monthName: string;
  /** Why the last picked file was turned away, or null. */
  problem: PickedPdfProblem | null;
  /** The server's message when the last upload failed, or null. */
  error: string | null;
}

/** Props for {@link ReadingStep}. */
export interface ReadingStepProps {
  filename: string;
}

/** Props for {@link ReviewForm}. */
export interface ReviewFormProps {
  /** The month the upload started from, `YYYY-MM`. */
  month: string;
  draft: BillDraftResponse;
  control: Control<ReviewFormValues>;
  /** Opens the picker again; the new file replaces this draft. */
  onChooseAnother: () => void;
  /** The server's message when Save failed, or null. */
  saveError: string | null;
}

/** Props for {@link LineRow}. */
export interface LineRowProps {
  control: Control<ReviewFormValues>;
  index: number;
  /** The line's name as it is now, for the remove button's label. */
  label: string;
  onRemove: () => void;
}

/** Props for {@link UploadFooter}. */
export interface UploadFooterProps {
  children: ReactNode;
}
