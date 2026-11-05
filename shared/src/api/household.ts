import { z } from 'zod';
import { monthKey, personColor } from '../schemas/primitives';
import { badgeSchema } from './history';

/** `GET /api/household` query: the month to show. Missing means the active month. */
export const householdViewQuerySchema = z.object({
  month: monthKey.optional(),
});

/** `GET /api/household` query: the month to show. Missing means the active month. */
export type HouseholdViewQuery = z.infer<typeof householdViewQuerySchema>;

/** Where a Household button leads. The app navigates; it decides nothing. */
export const householdTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('edit-home') }),
  z.object({ kind: z.literal('edit-splits') }),
  z.object({ kind: z.literal('edit-person'), personId: z.string() }),
  z.object({ kind: z.literal('view-person'), personId: z.string() }),
  z.object({ kind: z.literal('add-person') }),
]);

/** Where a Household button leads. The app navigates; it decides nothing. */
export type HouseholdTarget = z.infer<typeof householdTargetSchema>;

/** A button on the Household screen. */
export const householdActionSchema = z.object({
  /** e.g. `Edit split`. */
  label: z.string(),
  target: householdTargetSchema,
});

/** A button on the Household screen. */
export type HouseholdAction = z.infer<typeof householdActionSchema>;

/** One entry in the "Showing:" month list. */
export const householdMonthOptionSchema = z.object({
  /** `YYYY-MM`. The app asks for this month when it is picked. */
  month: monthKey,
  /** e.g. `Nov 2026`. */
  label: z.string(),
  /** `Upcoming` for a month after the active one; otherwise null. */
  badge: badgeSchema.nullable(),
});

/** One entry in the "Showing:" month list. */
export type HouseholdMonthOption = z.infer<typeof householdMonthOptionSchema>;

/** A small stat tile on the landlord card. */
export const householdStatSchema = z.object({
  /** e.g. `3`. */
  value: z.string(),
  /** e.g. `rooms`. */
  label: z.string(),
});

/** A small stat tile on the landlord card. */
export type HouseholdStat = z.infer<typeof householdStatSchema>;

/** A label and value on a person's card. */
export const householdFactSchema = z.object({
  /** e.g. `Rent · due 28th`. */
  label: z.string(),
  /** e.g. `$X,XXX.XX`. */
  value: z.string(),
});

/** A label and value on a person's card. */
export type HouseholdFact = z.infer<typeof householdFactSchema>;

/** One person's card. The owner's card comes last and reads `You`. */
export const householdPersonSchema = z.object({
  personId: z.string(),
  /** e.g. `S`. */
  initial: z.string(),
  name: z.string(),
  /** The avatar's fill. */
  color: personColor,
  facts: z.array(householdFactSchema),
  /** The buttons in the order drawn. Empty on the owner's card and for someone not in the household next month. */
  actions: z.array(householdActionSchema),
});

/** One person's card. The owner's card comes last and reads `You`. */
export type HouseholdPerson = z.infer<typeof householdPersonSchema>;

/** One person's part of a Household split row: a bar segment and a legend entry. */
export const householdSplitSegmentSchema = z.object({
  personId: z.string(),
  /** e.g. `Priya`, or `You` for the owner. */
  name: z.string(),
  /** e.g. `$X,XXX.XX`, `1.5`. */
  value: z.string(),
  /** The segment's width, 0 to 100. A person at 0 has no segment but stays in the legend. */
  percent: z.number().min(0).max(100),
  color: personColor,
  /** False for a tenant whose room's rent is not part of the landlord rent: a hollow ring, a muted value and no bar segment. */
  inTotal: z.boolean(),
});

/** One person's part of a Household split row: a bar segment and a legend entry. */
export type HouseholdSplitSegment = z.infer<typeof householdSplitSegmentSchema>;

/** One row of "Household split": rent, utilities or aircon, across everyone. */
export const householdSplitRowSchema = z.object({
  /** e.g. `Rent`. */
  label: z.string(),
  /** The total, e.g. `$X,XXX.XX`, `5 shares`. */
  detail: z.string(),
  /** The owner first, then the primary tenant, then the tenants. */
  segments: z.array(householdSplitSegmentSchema),
  /** e.g. `Not in total: Jordan`. Null when everyone is in the total. */
  note: z.string().nullable(),
  /** The bar read out, e.g. `Rent: You $X,XXX.XX, Priya $X,XXX.XX`. */
  accessibilityLabel: z.string(),
});

/** One row of "Household split": rent, utilities or aircon, across everyone. */
export type HouseholdSplitRow = z.infer<typeof householdSplitRowSchema>;

/** `GET /api/household`: the Household screen for one month, ready to render. */
export const householdViewResponseSchema = z.object({
  /** `YYYY-MM`. The month shown. */
  month: monthKey,
  /** e.g. `Nov 2026`, for "Showing:". */
  monthLabel: z.string(),
  /** Newest first. */
  monthOptions: z.array(householdMonthOptionSchema),
  landlord: z.object({
    /** e.g. `Landlord rent · due 1st of the month`. */
    label: z.string(),
    /** e.g. `$X,XXX.XX`. */
    amount: z.string(),
    stats: z.array(householdStatSchema),
    edit: householdActionSchema,
  }),
  /** The "Household split" rows: rent, utilities and aircon. */
  splitRows: z.array(householdSplitRowSchema),
  /** The heading's Edit splits button. */
  editSplits: householdActionSchema,
  people: z.array(householdPersonSchema),
  addPerson: householdActionSchema,
});

/** `GET /api/household`: the Household screen for one month, ready to render. */
export type HouseholdViewResponse = z.infer<typeof householdViewResponseSchema>;

/** `GET /api/household/form` query: the person. */
export const householdFormQuerySchema = z.object({
  personId: z.string().min(1),
});

/** `GET /api/household/form` query: the person. */
export type HouseholdFormQuery = z.infer<typeof householdFormQuerySchema>;

/** A label and its plain text on a View screen. */
export const householdFormTextRowSchema = z.object({
  /** e.g. `Rent (SGD)`. */
  label: z.string(),
  /** e.g. `X,XXX.XX`, `None`, `—`. */
  value: z.string(),
});

/** A label and its plain text on a View screen. */
export type HouseholdFormTextRow = z.infer<typeof householdFormTextRowSchema>;

/** `GET /api/household/form`: one person's Edit and View screens, with their latest saved values, ready to render. */
export const householdFormResponseSchema = z.object({
  personId: z.string(),
  /** e.g. `Edit Jordan`. */
  title: z.string(),
  /** The View screen's title, e.g. `Jordan`. */
  viewTitle: z.string(),
  /** The dated group's title on Edit, e.g. `From December 2026`. */
  datedTitle: z.string(),
  /** e.g. `These take effect from December 2026.` while saved values differ from the active month's; otherwise null. */
  pendingNote: z.string().nullable(),
  /** The form's values. A route's person is null when it is paid directly. */
  values: z.object({
    name: z.string(),
    whatsappE164: z.string().nullable(),
    color: personColor,
    rentDueDay: z.number().int().nullable(),
    utilitiesDueDay: z.number().int().nullable(),
    rentViaPersonId: z.string().nullable(),
    utilitiesViaPersonId: z.string().nullable(),
    /** Null for the owner and the primary tenant, who hold no deposit. */
    depositCents: z.number().int().nullable(),
  }),
  /** Edit's Room group for a tenant, read-only: the room, its rent and its units. Empty for anyone else. */
  room: z.array(householdFormTextRowSchema),
  /** e.g. `Green`, beside the Color label. */
  colorName: z.string(),
  /** The colors that can be picked, in the order drawn. Teal is only offered to the owner. */
  swatches: z.array(z.object({ color: personColor, name: z.string() })),
  /**
   * Who a tenant's charge can be sent via: anyone in the version who pays directly, but them and the owner.
   * Empty for anyone else, and for a tenant someone already pays via.
   */
  sentViaOptions: z.array(z.object({ personId: z.string(), name: z.string() })),
  /** The View screen's text, by section. */
  view: z.object({
    details: z.array(householdFormTextRowSchema),
    /** Tenants only: the room, its rent, their utility shares and the room's units. */
    room: z.array(householdFormTextRowSchema),
    amounts: z.array(householdFormTextRowSchema),
    /** Tenants only. */
    routes: z.array(householdFormTextRowSchema),
  }),
  /** The link under Save. */
  secondaryAction: z.object({
    label: z.string(),
    kind: z.enum(['remove-person', 'cancel']),
  }),
  /** The remove dialog's text. Null for anyone but a tenant. */
  removeDialog: z
    .object({
      /** e.g. `Remove Jordan from household?`. */
      title: z.string(),
      body: z.string(),
      /** What happens to their room, worded by whether its rent is part of the landlord rent. */
      roomLine: z.string(),
      /** The check lines: what stays and what goes with them. */
      keeps: z.array(z.string()),
    })
    .nullable(),
});

/** `GET /api/household/form`: one person's Edit and View screens, with their latest saved values, ready to render. */
export type HouseholdFormResponse = z.infer<typeof householdFormResponseSchema>;

/** `GET /api/household/add-form`: the Add subtenant screen, ready to render. Its fields start empty. */
export const householdAddFormResponseSchema = householdFormResponseSchema
  .pick({ title: true, datedTitle: true, colorName: true, swatches: true, sentViaOptions: true })
  .extend({
    /** `New person in the household`. */
    sub: z.string(),
    /** The default: the first color nobody in the household uses. */
    color: personColor,
    /** The empty tenant rooms a new tenant can pick, in saved order. Empty when every room is taken or none exists. */
    rooms: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        /** What the form shows once the room is picked: its rent and aircon units. */
        facts: z.array(householdFormTextRowSchema),
      }),
    ),
  });

/** `GET /api/household/add-form`: the Add subtenant screen, ready to render. Its fields start empty. */
export type HouseholdAddFormResponse = z.infer<typeof householdAddFormResponseSchema>;

/** One room on the Landlord & rooms screen. */
export const householdHomeRoomSchema = z.object({
  id: z.string(),
  roomType: z.enum(['MASTER', 'TENANT', 'COMMON']),
  /** The card's title: `Master room`, `Tenant room` or `Common room`. */
  title: z.string(),
  name: z.string(),
  /** Null only for a room First run has not filled in yet (11.3). */
  airconUnits: z.number().int().nullable(),
  /** Null for anything but a tenant room. */
  rentCents: z.number().int().nullable(),
  /** Null for anything but a tenant room. */
  includeInTotal: z.boolean().nullable(),
  /** The master room's calculated rent, e.g. `$X,XXX.XX`. Null for any other room. */
  calculatedRent: z.string().nullable(),
  /** The read-only Shared by or Tenant value, e.g. `You + Priya`, `Jordan`. Null for an empty or common room. */
  occupants: z.string().nullable(),
  /** `Empty` on a tenant room with no one in it; otherwise null. */
  badge: badgeSchema.nullable(),
  /** Whether the card has Remove room: a common room or an empty tenant room. */
  canRemove: z.boolean(),
});

/** One room on the Landlord & rooms screen. */
export type HouseholdHomeRoom = z.infer<typeof householdHomeRoomSchema>;

/** `GET /api/household/home-form`: the Landlord & rooms screen, with the latest saved values, ready to render. */
export const householdHomeFormResponseSchema = z.object({
  /** `Landlord & rooms`. */
  title: z.string(),
  /** `Rent you pay the landlord`. */
  sub: z.string(),
  /** The heading above the cards, e.g. `From December 2026`. */
  datedTitle: z.string(),
  /** e.g. `These take effect from December 2026.` while saved values differ from the active month's; otherwise null. */
  pendingNote: z.string().nullable(),
  values: z.object({
    /** Null only before First run has filled it in (11.3). */
    landlordRentCents: z.number().int().nullable(),
    /** Null only before First run has filled it in (11.3). */
    landlordDueDay: z.number().int().nullable(),
    /** Optional, so null when not set. */
    billDueDay: z.number().int().nullable(),
  }),
  /** The master room, then tenant rooms, then common rooms, each in saved order. */
  rooms: z.array(householdHomeRoomSchema),
  /** The types Add room offers, with the title and badge a new room's card shows. */
  newRoomTypes: z.array(
    z.object({
      roomType: z.enum(['TENANT', 'COMMON']),
      /** e.g. `Tenant room`. */
      title: z.string(),
      badge: badgeSchema.nullable(),
    }),
  ),
});

/** `GET /api/household/home-form`: the Landlord & rooms screen, with the latest saved values, ready to render. */
export type HouseholdHomeFormResponse = z.infer<typeof householdHomeFormResponseSchema>;

/** What a split card works out: what is left to split and each person's part of it. */
export const householdSplitAmountSchema = z.object({
  /** e.g. `$X,XXX.XX`, `3`, `4`. */
  left: z.string(),
  /** e.g. `$X,XXX.XX`, `1.5 shares`, `2 units`; `—` when nothing is left to split. */
  owner: z.string(),
  /** The same for the primary tenant. Null when there is none. */
  primary: z.string().nullable(),
});

/** What a split card works out: what is left to split and each person's part of it. */
export type HouseholdSplitAmount = z.infer<typeof householdSplitAmountSchema>;

/** A card split by count: its amounts, and the same counts as numbers for the count fields. */
export const householdSplitCountAmountSchema = householdSplitAmountSchema.extend({
  /** In thousandths of a share or unit. All 0 when nothing is left to split. */
  counts: z.object({
    left: z.number().int(),
    owner: z.number().int(),
    /** Null when there is no primary tenant. */
    primary: z.number().int().nullable(),
  }),
});

/** A card split by count: its amounts, and the same counts as numbers for the count fields. */
export type HouseholdSplitCountAmount = z.infer<typeof householdSplitCountAmountSchema>;

/** What the three split cards work out, on the form and again on each preview. */
export const householdSplitAmountsSchema = z.object({
  rent: householdSplitAmountSchema,
  utilities: householdSplitCountAmountSchema,
  aircon: householdSplitCountAmountSchema,
});

/** What the three split cards work out, on the form and again on each preview. */
export type HouseholdSplitAmounts = z.infer<typeof householdSplitAmountsSchema>;

/** A tenant's read-only row on the Rent or Aircon card. */
export const householdSplitRoomRowSchema = z.object({
  personId: z.string(),
  /** e.g. `Jordan · Room 3`. */
  name: z.string(),
  color: personColor,
  /** e.g. `$X,XXX.XX`, `1`. */
  value: z.string(),
  /** False for a room not in the landlord rent: a hollow ring and the `Not in total` marker. Always true on Aircon. */
  inTotal: z.boolean(),
});

/** A tenant's read-only row on the Rent or Aircon card. */
export type HouseholdSplitRoomRow = z.infer<typeof householdSplitRoomRowSchema>;

/** `GET /api/household/split-form`: the Household split screen, with the latest saved values, ready to render. */
export const householdSplitFormResponseSchema = z.object({
  /** `Household split`. */
  title: z.string(),
  /** The heading above the cards, e.g. `From December 2026`. */
  datedTitle: z.string(),
  /** e.g. `These take effect from December 2026.` while saved values differ from the active month's; otherwise null. */
  pendingNote: z.string().nullable(),
  /** e.g. `Split between you and Priya`. Null with no primary tenant, when the split control is left out. */
  splitTitle: z.string().nullable(),
  /** The left side of each split control. */
  owner: z.object({ name: z.string(), color: personColor }),
  /** The right side of each split control. Null with no primary tenant. */
  primary: z.object({ name: z.string(), color: personColor }).nullable(),
  values: z.object({
    /** Each tenant's shares input, in thousandths of a share (1.5 shares = 1500). */
    tenantShares: z.array(
      z.object({
        personId: z.string(),
        name: z.string(),
        color: personColor,
        utilityShares: z.number().int(),
      }),
    ),
    /** In thousandths of a share. */
    totalShares: z.number().int(),
    /** In basis points (5000 = 50%). The owner has the rest. */
    rentPrimaryBps: z.number().int(),
  }),
  rent: z.object({
    /** `Rent (SGD)`. */
    title: z.string(),
    rows: z.array(householdSplitRoomRowSchema),
    /** `Shared rent`, beside the amounts' `left`. */
    leftLabel: z.string(),
  }),
  utilities: z.object({
    /** `Utilities (shares)`. */
    title: z.string(),
    /** `Total shares`, the input's label. */
    totalLabel: z.string(),
    /** `Left to split`, beside the amounts' `left`. */
    leftLabel: z.string(),
  }),
  aircon: z.object({
    /** `Aircon (units)`. */
    title: z.string(),
    rows: z.array(householdSplitRoomRowSchema),
    /** `Left to split`, beside the amounts' `left`. */
    leftLabel: z.string(),
    /** `Total units`. */
    totalLabel: z.string(),
    /** e.g. `6`. */
    total: z.string(),
  }),
  /** The saved values' amounts, until a preview answers. */
  amounts: householdSplitAmountsSchema,
});

/** `GET /api/household/split-form`: the Household split screen, with the latest saved values, ready to render. */
export type HouseholdSplitFormResponse = z.infer<typeof householdSplitFormResponseSchema>;

/** Changes to a saved room. Only the fields sent are applied, and null or an empty name means the field was cleared. */
export const householdRoomEditSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  airconUnits: z.number().int().nullable().optional(),
  /** Tenant rooms only. */
  rentCents: z.number().int().nullable().optional(),
  /** Tenant rooms only. */
  includeInTotal: z.boolean().optional(),
});

/** Changes to a saved room. Only the fields sent are applied. */
export type HouseholdRoomEdit = z.infer<typeof householdRoomEditSchema>;

/** A room to add. Its type is set here and never edited. Null or an empty name means the field is empty. */
export const householdNewRoomSchema = z.discriminatedUnion('roomType', [
  z.object({
    roomType: z.literal('TENANT'),
    name: z.string(),
    airconUnits: z.number().int().nullable(),
    rentCents: z.number().int().nullable(),
    includeInTotal: z.boolean(),
  }),
  z.object({
    roomType: z.literal('COMMON'),
    name: z.string(),
    airconUnits: z.number().int().nullable(),
  }),
]);

/** A room to add. Its type is set here and never edited. */
export type HouseholdNewRoom = z.infer<typeof householdNewRoomSchema>;

/**
 * An edit to Landlord & rooms, which always starts next month, which the server works out. Only the fields sent
 * are applied, and a saved room not listed stays as it is. The preview answers errors under `landlordRentCents`,
 * `landlordDueDay`, `billDueDay`, `rooms.{id}.{field}` and `newRooms.{index}.{field}`.
 */
export const householdHomeEditSchema = z.object({
  kind: z.literal('home'),
  /** Null means the field was cleared, which is an error. */
  landlordRentCents: z.number().int().nullable().optional(),
  /** Null means the field was cleared, which is an error. */
  landlordDueDay: z.number().int().nullable().optional(),
  /** Null clears the day, which is allowed. */
  billDueDay: z.number().int().nullable().optional(),
  rooms: z.array(householdRoomEditSchema),
  newRooms: z.array(householdNewRoomSchema),
  /** Only empty rooms can go, and never the master room. */
  removedRoomIds: z.array(z.string().min(1)),
});

/** An edit to Landlord & rooms, which always starts next month. */
export type HouseholdHomeEdit = z.infer<typeof householdHomeEditSchema>;

/**
 * An edit to one person. Only the fields sent are applied. Dated fields always start next month, which the
 * server works out. The rules on the values (a required name, a valid number, day 1 to 31) are checked by the
 * server so the preview can answer per field.
 */
export const householdPersonEditSchema = z.object({
  kind: z.literal('person'),
  personId: z.string().min(1),
  // Saved right away, on the person.
  name: z.string().optional(),
  whatsappE164: z.string().nullable().optional(),
  color: personColor.optional(),
  // Saved from next month, on the version. Room rent and units are edited on Landlord & rooms.
  depositCents: z.number().int().optional(),
  /** Null clears the day. */
  rentDueDay: z.number().int().nullable().optional(),
  /** Also sets the aircon due day. Null clears both. */
  utilitiesDueDay: z.number().int().nullable().optional(),
  /** Who rent is sent via. Null means paid directly. Tenants only. */
  rentViaPersonId: z.string().min(1).nullable().optional(),
  /** Who utilities are sent via, which also sets aircon. Null means paid directly. Tenants only. */
  utilitiesViaPersonId: z.string().min(1).nullable().optional(),
});

/** An edit to one person. Only the fields sent are applied. */
export type HouseholdPersonEdit = z.infer<typeof householdPersonEditSchema>;

/**
 * A new tenant, who joins from next month, which the server works out. A required field not filled yet is
 * null or empty: the preview answers `canSave: false` with no error for it, so an untouched form stays calm.
 */
export const householdAddPersonEditSchema = z.object({
  kind: z.literal('addPerson'),
  name: z.string(),
  whatsappE164: z.string().nullable(),
  color: personColor,
  /** An empty tenant room. Its rent and units come with it. */
  roomId: z.string().min(1).nullable(),
  /** In thousandths of a share (1.5 shares = 1500). */
  utilityShares: z.number().int().nullable(),
  depositCents: z.number().int(),
  /** Required unless rent is sent via someone. */
  rentDueDay: z.number().int().nullable(),
  /** Also sets the aircon due day. Required unless utilities are sent via someone. */
  utilitiesDueDay: z.number().int().nullable(),
  /** Who rent is sent via. Null means paid directly. */
  rentViaPersonId: z.string().min(1).nullable(),
  /** Who utilities are sent via, which also sets aircon. Null means paid directly. */
  utilitiesViaPersonId: z.string().min(1).nullable(),
});

/** A new tenant, who joins from next month. */
export type HouseholdAddPersonEdit = z.infer<typeof householdAddPersonEditSchema>;

/** Removes a tenant from next month, which the server works out. Their `Person` row and past months stay. */
export const householdRemovePersonEditSchema = z.object({
  kind: z.literal('removePerson'),
  personId: z.string().min(1),
});

/** Removes a tenant from next month. */
export type HouseholdRemovePersonEdit = z.infer<typeof householdRemovePersonEditSchema>;

/**
 * An edit to the Household split, which always starts next month, which the server works out. Only the fields sent
 * are applied, and null means the field was cleared, which is an error. The preview answers errors under
 * `tenantShares.{personId}`, `totalShares`, `rentPrimaryBps`, `utilitiesPrimaryShares`, `airconPrimaryUnits` and
 * `leftToSplit` (tenants taking every share), and warnings under `tenantShares.{personId}`, `rentPrimaryBps`,
 * `utilitiesPrimaryShares` and `airconPrimaryUnits` (someone at 0, which still allows Save).
 */
export const householdSplitEditSchema = z.object({
  kind: z.literal('split'),
  tenantShares: z.array(
    z.object({
      personId: z.string().min(1),
      /** In thousandths of a share (1.5 shares = 1500). */
      utilityShares: z.number().int().nullable(),
    }),
  ),
  /** In thousandths of a share. */
  totalShares: z.number().int().nullable().optional(),
  /** In basis points (5000 = 50%), 0% to 100%. The owner has the rest. */
  rentPrimaryBps: z.number().int().nullable().optional(),
  /**
   * The primary tenant's part of what is left, in thousandths of a share, with the owner taking the rest. The server
   * stores it as a percent. Not sent means the saved percent stays, so both parts follow what is left.
   */
  utilitiesPrimaryShares: z.number().int().nullable().optional(),
  /** The same for aircon, in thousandths of a unit. */
  airconPrimaryUnits: z.number().int().nullable().optional(),
});

/** An edit to the Household split, which always starts next month. */
export type HouseholdSplitEdit = z.infer<typeof householdSplitEditSchema>;

/** `POST /api/household/edits` and `.../preview` body: one typed edit. The app never sends a config. */
export const householdEditSchema = z.discriminatedUnion('kind', [
  householdPersonEditSchema,
  householdAddPersonEditSchema,
  householdRemovePersonEditSchema,
  householdHomeEditSchema,
  householdSplitEditSchema,
]);

/** `POST /api/household/edits` and `.../preview` body: one typed edit. The app never sends a config. */
export type HouseholdEdit = z.infer<typeof householdEditSchema>;

/** One changed value in the summary card. */
export const householdEditRowSchema = z.object({
  /** e.g. `Rent due`. The screen is already about the person, so it has no name in it. */
  label: z.string(),
  /** e.g. `$X,XXX.XX`. */
  from: z.string(),
  /** e.g. `$X,XXX.XX`. */
  to: z.string(),
});

/** One changed value in the summary card. */
export type HouseholdEditRow = z.infer<typeof householdEditRowSchema>;

/** A group in the summary card. A group with no rows is left out. */
export const householdEditGroupSchema = z.object({
  /** `Saves now` or `Saves from Dec 2026`. */
  title: z.string(),
  rows: z.array(householdEditRowSchema),
});

/** A group in the summary card. A group with no rows is left out. */
export type HouseholdEditGroup = z.infer<typeof householdEditGroupSchema>;

/** `POST /api/household/edits/preview`: what the edit would change. Nothing is stored. */
export const householdEditPreviewResponseSchema = z.object({
  /** Empty hides the summary card. */
  groups: z.array(householdEditGroupSchema),
  /** Whether Save would store something, with no errors. */
  canSave: z.boolean(),
  /** Messages by request field name; `form` for one that belongs to no field. */
  errors: z.record(z.string(), z.string()),
  /** Messages that still allow Save, by request field name. Only for a `home` or `split` edit. */
  warnings: z.record(z.string(), z.string()).optional(),
  /** The master room's calculated rent, e.g. `$X,XXX.XX`, or null while it can't be worked out. Only for a `home` edit. */
  masterRent: z.string().nullable().optional(),
  /** What the split cards work out from the values sent, reading an empty field as 0. Only for a `split` edit. */
  amounts: householdSplitAmountsSchema.optional(),
});

/** `POST /api/household/edits/preview`: what the edit would change. Nothing is stored. */
export type HouseholdEditPreviewResponse = z.infer<typeof householdEditPreviewResponseSchema>;

/** `POST /api/household/edits`: what was stored. */
export const householdEditSaveResponseSchema = z.object({
  /** The version's starts-from month, or null when only name, WhatsApp or color changed. */
  savedFromMonth: monthKey.nullable(),
});

/** `POST /api/household/edits`: what was stored. */
export type HouseholdEditSaveResponse = z.infer<typeof householdEditSaveResponseSchema>;
