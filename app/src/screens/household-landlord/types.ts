import type { Control } from 'react-hook-form';

import type { BadgeContent, HouseholdHomeFormResponse } from '@splithouse/shared';
import type { HomeFormValues, NewRoomFormValues } from './helpers';

/** Props for {@link LandlordRoomsForm}. */
export interface LandlordRoomsFormProps {
  /** The loaded response. It fills the form when the form opens. */
  form: HouseholdHomeFormResponse;
}

/** Props for {@link DatedHeading}. */
export interface DatedHeadingProps {
  /** e.g. `From December 2026`, or null in First run, when only the note, if any, shows. */
  title: string | null;
  /** The line with the clock under it, or null for none. */
  note: string | null;
}

/** Props for {@link LandlordFields}. */
export interface LandlordFieldsProps {
  control: Control<HomeFormValues>;
  /** The server's messages, by request field name. */
  errors: Record<string, string>;
}

/** Props for {@link RoomCard}. */
export interface RoomCardProps {
  control: Control<HomeFormValues>;
  /** Where the room's values sit in the form. */
  path: `rooms.${number}` | `newRooms.${number}`;
  /** Where the server answers about the room: `rooms.{id}` or `newRooms.{index}`. */
  errorKey: string;
  roomType: 'MASTER' | 'TENANT' | 'COMMON';
  /** e.g. `Tenant room`. */
  title: string;
  badge: BadgeContent | null;
  /** The master room's calculated rent, with `—` while it can't be worked out. Null for any other room. */
  calculatedRent: string | null;
  /** The read-only Shared by or Tenant value, or null for none. */
  occupants: string | null;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  /** Tapped on Remove room. Null means the room has no such button. */
  onRemove: (() => void) | null;
}

/** Props for {@link ReadOnlyField}. */
export interface ReadOnlyFieldProps {
  label: string;
  value: string;
  error?: string;
  className?: string;
}

/** Props for {@link RemovedRoomCard}. */
export interface RemovedRoomCardProps {
  /** The room's saved name. */
  name: string;
  onUndo: () => void;
}

/** Props for {@link AddRoomSheet}. */
export interface AddRoomSheetProps {
  /** The types to pick from, in the order drawn. */
  types: HouseholdHomeFormResponse['newRoomTypes'];
  /** Called with the new room, once its fields are filled. */
  onAdd: (room: NewRoomFormValues) => void;
}
