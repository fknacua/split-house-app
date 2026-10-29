import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';

import type { BillBlocker, BillDraftResponse, BillLinesNote } from '@splithouse/shared';
import type { PickedPdfProblem, ReviewFormValues } from './helpers';

/** Which board of Bill upload is showing. */
export type UploadStep = 'pick' | 'review';

/** Props for {@link FileCard}. */
export interface FileCardProps {
  filename: string;
  /** e.g. `2 pages · 214 KB`. Left out while the file is still uploading. */
  meta?: string;
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

/** Props for {@link ReviewSkeleton}. */
export interface ReviewSkeletonProps {
  /** The picked file's name, shown while the server reads it. */
  filename: string;
}

/** Props for {@link ReviewForm}. */
export interface ReviewFormProps {
  draft: BillDraftResponse;
  control: Control<ReviewFormValues>;
  /** Opens the picker again; the new file replaces this draft. */
  onChooseAnother: () => void;
  /** What the server's check says stops Save; empty while all is well (or before the first answer). */
  blockers: BillBlocker[];
  /** The server's note on whether the lines add up to the Subtotal, or null while there is nothing to compare. */
  linesNote: BillLinesNote | null;
  /** The server's message when Save failed, or null. */
  saveError: string | null;
}

/** Props for {@link SubtotalRow}. */
export interface SubtotalRowProps {
  subtotalCents: number;
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
