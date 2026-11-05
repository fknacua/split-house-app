import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';

import type {
  HouseholdAddFormResponse,
  HouseholdEditGroup,
  HouseholdEditRow,
  HouseholdFormResponse,
  HouseholdFormTextRow,
  PersonColor,
} from '@splithouse/shared';
import type { PersonFormValues } from './helpers';
import type { useEditFlow } from './use-edit-flow';

/** Props for {@link FormSection}. */
export interface FormSectionProps {
  title: string;
  /** A line under the title, or null for none. */
  note?: string | null;
  /** Draws the rule above the section. False for the first one. */
  separated: boolean;
  children: ReactNode;
}

/** Props for {@link ColorField}. */
export interface ColorFieldProps {
  control: Control<PersonFormValues>;
  /** The colors that can be picked, in the order drawn. */
  swatches: HouseholdFormResponse['swatches'];
  /** The stored color's name, for a color that cannot be picked. */
  fallbackName: string;
}

/** Props for {@link RouteField}. */
export interface RouteFieldProps {
  control: Control<PersonFormValues>;
  /** The form field holding the route. */
  name: 'rentVia' | 'utilitiesVia';
  /** e.g. `Rent paid`. */
  label: string;
  /** Who it can be sent via. With nobody to pick, only Directly can be chosen. */
  options: HouseholdFormResponse['sentViaOptions'];
  /** The server's message for the Sent via field. */
  error?: string;
}

/** Props for {@link RoomField}. */
export interface RoomFieldProps {
  control: Control<PersonFormValues>;
  /** The empty tenant rooms. None shows the no-room state. */
  rooms: HouseholdAddFormResponse['rooms'];
  /** The server's message for the Room field. */
  error?: string;
}

/** Props for {@link RoomFacts}. */
export interface RoomFactsProps {
  /** The labels and their plain text. */
  facts: HouseholdFormTextRow[];
}

/** Props for {@link LandlordRoomsLink}. */
export interface LandlordRoomsLinkProps {
  /** e.g. `Change on Landlord & rooms`. */
  label: string;
}

/** Props for {@link ColorSwatch}. */
export interface ColorSwatchProps {
  color: PersonColor;
  /** e.g. `Green`, read out by screen readers. */
  name: string;
  selected: boolean;
  onPress: () => void;
}

/** Props for {@link EditSummaryCard}. */
export interface EditSummaryCardProps {
  /** What the edit would change. Empty with no `loading` hides the card. */
  groups: HouseholdEditGroup[];
  /** The Spinner in the corner, while a newer answer is on its way. */
  loading: boolean;
}

/** Props for {@link EditSummaryRow}. */
export interface EditSummaryRowProps {
  /** The label, old value and new value. */
  row: HouseholdEditRow;
}

/** Props for {@link PersonForm}. */
export interface PersonFormProps {
  /** The loaded response. It fills the form when the form opens. */
  form: HouseholdFormResponse;
}

/** Props for {@link AddPersonForm}. */
export interface AddPersonFormProps {
  /** The loaded response. It sets the default color and the lists. */
  form: HouseholdAddFormResponse;
}

/** Props for {@link EditSaveActions}. */
export interface EditSaveActionsProps {
  flow: Pick<ReturnType<typeof useEditFlow>, 'noticeError' | 'failed' | 'saveError' | 'saving' | 'canSave' | 'onSave'>;
  /** The form's own checks stop the save. The server's answer counts as well. */
  disabled: boolean;
}

/** Props for {@link RemovePersonDialog}. */
export interface RemovePersonDialogProps {
  open: boolean;
  personId: string;
  /** The text the server wrote. */
  dialog: NonNullable<HouseholdFormResponse['removeDialog']>;
  onClose: () => void;
}

/** Props for {@link ViewRow}. */
export interface ViewRowProps {
  /** The label and its plain text. */
  row: HouseholdFormTextRow;
  /** Takes half the width, beside another row. */
  half?: boolean;
}

/** Props for {@link ViewColorRow}. */
export interface ViewColorRowProps {
  color: PersonColor;
  /** e.g. `Green`. */
  name: string;
}
