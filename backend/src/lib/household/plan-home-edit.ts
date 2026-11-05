import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatDayOrdinal,
  formatMonthShortLabel,
  householdConfigSchema,
  requiredText,
  type HouseholdConfig,
  type HouseholdEditGroup,
  type HouseholdEditRow,
  type HouseholdHomeEdit,
  type HouseholdRoom,
} from "@splithouse/shared";
import { splitRemainderByBps } from "@/lib/split/engine";
import { applyHomeEdit } from "./apply-edit";
import { DAY_ERROR, type ParsedVersion } from "./plan-edit";
import { masterRentCents, peopleIn, totalAirconUnits } from "./room-amounts";

/** What `planHomeEdit` reads. */
export interface HomeEditPlanInput {
  edit: HouseholdHomeEdit;
  /** Everyone's names, by person id, for the primary tenant's rent row. */
  names: Map<string, string>;
  /** The month the edit starts from: the one after the active month. */
  month: string;
  /** The version in effect at that month. */
  base: ParsedVersion;
  /** The id for each of `edit.newRooms`, in order. */
  newRoomIds: string[];
}

/** What a Landlord & rooms edit would do. The preview returns it and the save stores it. */
export interface HomeEditPlan {
  /** The new config, or null when nothing changes or the new one is invalid. */
  nextConfig: HouseholdConfig | null;
  groups: HouseholdEditGroup[];
  errors: Record<string, string>;
  warnings: Record<string, string>;
  /** The master room's calculated rent, or null while a rent is empty, invalid or too high. */
  masterRent: string | null;
  canSave: boolean;
}

const NONE = "—";
const NEGATIVE_ERROR = "Enter 0 or more.";
const MISSING_ROOM_ERROR = "This room is no longer in the household.";

/** A room's fields as sent, with the prefix its errors go under. */
interface RoomDraft {
  key: string;
  name: string | undefined;
  airconUnits: number | null | undefined;
  rentCents: number | null | undefined;
  /** The name for the zero-rent warning. */
  label: string;
}

const dayText = (day: number | undefined) => (day ? formatDayOrdinal(day) : NONE);

/** The message for an amount: empty, below zero, or none. A field not sent has none. */
function amountError(value: number | null | undefined, emptyMessage: string): string | null {
  if (value === null) return emptyMessage;
  return value !== undefined && value < 0 ? NEGATIVE_ERROR : null;
}

/** Every room the edit touches, in one shape, with the rules that belong to the room's identity. */
function roomDrafts(edit: HouseholdHomeEdit, config: HouseholdConfig, errors: Record<string, string>): RoomDraft[] {
  const saved = edit.rooms
    .filter((e) => !edit.removedRoomIds.includes(e.id))
    .flatMap((e): RoomDraft[] => {
      const room = config.rooms.find((r) => r.id === e.id);
      if (!room) {
        errors.form = MISSING_ROOM_ERROR;
        return [];
      }
      if (room.roomType !== "TENANT" && (e.rentCents !== undefined || e.includeInTotal !== undefined)) {
        errors.form = "Only tenant rooms have rent.";
      }
      return [{ key: `rooms.${e.id}`, name: e.name, airconUnits: e.airconUnits, rentCents: e.rentCents, label: e.name?.trim() || room.name }];
    });
  const added = edit.newRooms.map(
    (room, i): RoomDraft => ({
      key: `newRooms.${i}`,
      name: room.name,
      airconUnits: room.airconUnits,
      rentCents: room.roomType === "TENANT" ? room.rentCents : undefined,
      label: room.name.trim(),
    }),
  );
  return [...saved, ...added];
}

/** The rules on removing rooms: never the master room, and only an empty tenant room. */
function removalErrors(edit: HouseholdHomeEdit, config: HouseholdConfig, errors: Record<string, string>): void {
  for (const id of edit.removedRoomIds) {
    const room = config.rooms.find((r) => r.id === id);
    if (!room) errors.form = MISSING_ROOM_ERROR;
    else if (room.roomType === "MASTER") errors.form = "The master room can’t be removed.";
    else if (peopleIn(config, id).length > 0) errors.form = `${room.name} has a tenant, so it can’t be removed.`;
  }
}

/** The field checks, and a warning for each tenant room at no rent. */
function fieldChecks(edit: HouseholdHomeEdit, config: HouseholdConfig) {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const landlordRent = amountError(edit.landlordRentCents, "Enter the landlord rent.");
  if (landlordRent) errors.landlordRentCents = landlordRent;
  const days = [
    ["landlordDueDay", edit.landlordDueDay],
    ["billDueDay", edit.billDueDay ?? undefined],
  ] as const;
  for (const [field, day] of days) {
    if (day === null || (day !== undefined && (day < 1 || day > 31))) errors[field] = DAY_ERROR;
  }

  removalErrors(edit, config, errors);
  for (const draft of roomDrafts(edit, config, errors)) {
    if (draft.name !== undefined && !requiredText.safeParse(draft.name).success) errors[`${draft.key}.name`] = "Enter a room name.";
    const units = amountError(draft.airconUnits, "Enter the aircon units.");
    if (units) errors[`${draft.key}.airconUnits`] = units;
    const rent = amountError(draft.rentCents, "Enter the rent.");
    if (rent) errors[`${draft.key}.rentCents`] = rent;
    else if (draft.rentCents === 0) warnings[`${draft.key}.rentCents`] = `${draft.label} rent is 0`;
  }
  return { errors, warnings };
}

/** The error key for a room, which is by index for one being added. */
function roomKey(roomId: string, newRoomIds: string[]): string {
  const added = newRoomIds.indexOf(roomId);
  return added >= 0 ? `newRooms.${added}` : `rooms.${roomId}`;
}

/** An error on any room whose name matches an earlier one, ignoring case. An empty name has its own error. */
function duplicateNameErrors(config: HouseholdConfig, newRoomIds: string[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const room of config.rooms) {
    const name = room.name.trim().toLowerCase();
    if (name && seen.has(name)) errors[`${roomKey(room.id, newRoomIds)}.name`] = "Duplicate room name";
    seen.add(name);
  }
  return errors;
}

/** The messages when the rooms in the total come to more than the landlord rent. */
function rentTooLowErrors(config: HouseholdConfig): Record<string, string> {
  const included = config.rooms.filter((room) => room.roomType === "TENANT" && room.includeInTotal && peopleIn(config, room.id).length > 0);
  const [only] = included;
  const master = config.rooms.find((room) => room.roomType === "MASTER");
  const sum = config.categories.rent.landlordRentCents - masterRentCents(config);
  return {
    landlordRentCents:
      included.length === 1 && only.roomType === "TENANT"
        ? `Less than ${only.name}’s rent of ${formatCents(only.rentCents)}`
        : `Less than the rooms in the total, ${formatCents(sum)}`,
    ...(master ? { [`rooms.${master.id}.rentCents`]: `Nothing left for the ${master.name}` } : {}),
  };
}

/** What the owner and primary tenant each pay of the master rent, by the engine's rule. */
function rentShares(config: HouseholdConfig) {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new Error("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;
  const parts = splitRemainderByBps(masterRentCents(config), owner.personId, primary?.personId ?? null, config.categories.rent.primaryBps);
  return { owner: parts[owner.personId], primary: primary ? { id: primary.personId, cents: parts[primary.personId] } : null };
}

/** One saved room's rows: removed, or only the fields that differ. Labels use the saved name. */
function roomRows(room: HouseholdRoom, next: HouseholdRoom | undefined): HouseholdEditRow[] {
  if (!next) {
    return [{ label: room.name, from: room.roomType === "TENANT" ? "Empty" : "Common", to: "Removed" }];
  }
  const isTenantRoom = room.roomType === "TENANT" && next.roomType === "TENANT";
  return [
    { label: `${room.name} name`, from: room.name, to: next.name },
    ...(isTenantRoom ? [{ label: `${room.name} rent`, from: formatCents(room.rentCents), to: formatCents(next.rentCents) }] : []),
    { label: `${room.name} aircon units`, from: String(room.airconUnits), to: String(next.airconUnits) },
    ...(isTenantRoom
      ? [{ label: `${room.name} in total`, from: room.includeInTotal ? "Yes" : "No", to: next.includeInTotal ? "Yes" : "No" }]
      : []),
  ];
}

/** The summary rows: only what differs between the two configs. */
function summaryRows(from: HouseholdConfig, to: HouseholdConfig, names: Map<string, string>): HouseholdEditRow[] {
  const landlord = {
    label: "Landlord rent",
    from: formatCents(from.categories.rent.landlordRentCents),
    to: formatCents(to.categories.rent.landlordRentCents),
  };
  const fromShares = rentShares(from);
  const toShares = rentShares(to);
  const master = from.rooms.find((room) => room.roomType === "MASTER");
  const added = to.rooms.filter((room) => !from.rooms.some((r) => r.id === room.id));

  const rows: HouseholdEditRow[] = [
    landlord,
    { label: "Pay landlord on", from: dayText(from.categories.rent.landlordDueDay), to: dayText(to.categories.rent.landlordDueDay) },
    { label: "Utilities bill due", from: dayText(from.categories.utilities.billDueDay), to: dayText(to.categories.utilities.billDueDay) },
    ...from.rooms.flatMap((room) =>
      roomRows(
        room,
        to.rooms.find((r) => r.id === room.id),
      ),
    ),
    ...added.map((room) => ({ label: room.name, from: NONE, to: "Added" })),
    // The boards leave this row out beside Landlord rent, which already explains it.
    ...(master && landlord.from === landlord.to
      ? [{ label: `${master.name} rent`, from: formatCents(masterRentCents(from)), to: formatCents(masterRentCents(to)) }]
      : []),
    { label: "Your rent share", from: formatCents(fromShares.owner), to: formatCents(toShares.owner) },
    ...(fromShares.primary && toShares.primary
      ? [
          {
            label: `${names.get(fromShares.primary.id) ?? "Someone"}’s rent`,
            from: formatCents(fromShares.primary.cents),
            to: formatCents(toShares.primary.cents),
          },
        ]
      : []),
    { label: "Aircon units", from: String(totalAirconUnits(from)), to: String(totalAirconUnits(to)) },
  ];
  return rows.filter((row) => row.from !== row.to);
}

/**
 * Works out what a Landlord & rooms edit would do, for the preview and the save alike. Pure: the service reads
 * the rows and stores the result. An empty field is an error here, unlike Add subtenant, since a loaded form
 * only gets one by clearing a value.
 *
 * @param input - The edit, the names, the month it starts from, the version in effect and the new rooms' ids.
 * @returns The new config, the summary groups, the errors and warnings per field, the master rent and whether Save is allowed.
 */
export function planHomeEdit(input: HomeEditPlanInput): HomeEditPlan {
  const { edit, names, month, base, newRoomIds } = input;
  const { errors: fieldErrors, warnings } = fieldChecks(edit, base.config);
  const applied = applyHomeEdit(base.config, edit, newRoomIds);
  const errors = { ...fieldErrors, ...duplicateNameErrors(applied, newRoomIds) };

  // The rent can be worked out while another field, such as a room name, is still wrong.
  const rentIsKnown = !Object.keys(errors).some((key) => key === "landlordRentCents" || key.endsWith(".rentCents"));
  const master = masterRentCents(applied);
  const rentTooLow = rentIsKnown && master < 0;
  if (rentTooLow) Object.assign(errors, rentTooLowErrors(applied));
  const masterRent = rentIsKnown && !rentTooLow ? formatCents(master) : null;

  const groups: HouseholdEditGroup[] = [];
  let nextConfig: HouseholdConfig | null = null;
  if (Object.keys(errors).length === 0) {
    const parsed = householdConfigSchema.safeParse(applied);
    if (!parsed.success) {
      errors.form = parsed.error.issues[0].message;
    } else {
      if (!isDeepStrictEqual(parsed.data, base.config)) nextConfig = parsed.data;
      const rows = summaryRows(base.config, parsed.data, names);
      if (rows.length > 0) groups.push({ title: `Saves from ${formatMonthShortLabel(month)}`, rows });
    }
  }

  return {
    nextConfig,
    groups,
    errors,
    warnings,
    masterRent,
    canSave: nextConfig !== null && Object.keys(errors).length === 0,
  };
}
