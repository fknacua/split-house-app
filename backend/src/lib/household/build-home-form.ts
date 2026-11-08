import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatMonthLabel,
  type HouseholdConfig,
  type HouseholdHomeFormResponse,
  type HouseholdHomeRoom,
  type HouseholdRoom,
} from "@splithouse/shared";
import { HOME_BADGES } from "@/lib/home/badges";
import { masterRentCents, peopleIn } from "./room-amounts";

/** What `buildHomeForm` reads. */
export interface HomeFormInput {
  /** The month after the active one, `YYYY-MM`: the latest saved values and any new edit start then. */
  month: string;
  /** The config in effect for `month`. */
  config: HouseholdConfig;
  /** The active month's config, to tell whether the saved values have taken effect yet. */
  activeConfig: HouseholdConfig | null;
  /** True in First run: every edit saves into the first version, so the heading above the cards is left out. */
  firstSetup?: boolean;
  /** Everyone's `Person` rows, for the names. */
  people: { id: string; name: string }[];
}

const ROOM_TITLES: Record<HouseholdRoom["roomType"], string> = {
  MASTER: "Master room",
  TENANT: "Tenant room",
  COMMON: "Common room",
};
const ROOM_ORDER: HouseholdRoom["roomType"][] = ["MASTER", "TENANT", "COMMON"];
const NEW_ROOM_TYPES: HouseholdHomeFormResponse["newRoomTypes"] = [
  { roomType: "TENANT", title: ROOM_TITLES.TENANT, badge: HOME_BADGES.roomEmpty },
  { roomType: "COMMON", title: ROOM_TITLES.COMMON, badge: null },
];

/** The values this screen edits or shows, to compare with the active month's. A tenant moving out shows as an empty room. */
function comparableValues(config: HouseholdConfig) {
  const { rent, utilities } = config.categories;
  return {
    landlordRentCents: rent.landlordRentCents,
    landlordDueDay: rent.landlordDueDay,
    billDueDay: utilities.billDueDay,
    rooms: config.rooms,
    occupied: config.people.map((p) => p.roomId).sort(),
  };
}

/** The read-only Shared by or Tenant value. */
function occupantsText(config: HouseholdConfig, room: HouseholdRoom, names: Map<string, string>): string | null {
  const inRoom = peopleIn(config, room.id);
  if (room.roomType === "MASTER") {
    const primary = inRoom.find((p) => p.role === "PRIMARY");
    return primary ? `You + ${names.get(primary.personId) ?? "Someone"}` : "You";
  }
  return inRoom.length > 0 ? inRoom.map((p) => names.get(p.personId) ?? "Someone").join(", ") : null;
}

/** One room's card. */
function roomCard(config: HouseholdConfig, room: HouseholdRoom, names: Map<string, string>): HouseholdHomeRoom {
  const isTenantRoom = room.roomType === "TENANT";
  const isEmpty = isTenantRoom && peopleIn(config, room.id).length === 0;
  return {
    id: room.id,
    roomType: room.roomType,
    title: ROOM_TITLES[room.roomType],
    name: room.name,
    airconUnits: room.airconUnits,
    rentCents: isTenantRoom ? room.rentCents : null,
    includeInTotal: isTenantRoom ? room.includeInTotal : null,
    calculatedRent: room.roomType === "MASTER" ? formatCents(masterRentCents(config)) : null,
    occupants: occupantsText(config, room, names),
    badge: isEmpty ? HOME_BADGES.roomEmpty : null,
    canRemove: room.roomType === "COMMON" || isEmpty,
  };
}

/**
 * The Landlord & rooms screen with the latest saved values, display-ready.
 *
 * @param input - The month, its config, the active month's config and everyone's names.
 * @returns The response for `GET /api/household/home-form`.
 */
export function buildHomeForm(input: HomeFormInput): HouseholdHomeFormResponse {
  const { activeConfig, config, month, firstSetup } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const { rent, utilities } = config.categories;
  const monthLabel = formatMonthLabel(month);
  const isPending = !activeConfig || !isDeepStrictEqual(comparableValues(activeConfig), comparableValues(config));

  return {
    title: "Rent & rooms",
    sub: "Rent, due dates and rooms",
    datedTitle: firstSetup ? null : `From ${monthLabel}`,
    pendingNote: isPending ? `These take effect from ${monthLabel}.` : null,
    values: {
      landlordRentCents: rent.landlordRentCents,
      landlordDueDay: rent.landlordDueDay,
      billDueDay: utilities.billDueDay ?? null,
    },
    rooms: ROOM_ORDER.flatMap((type) => config.rooms.filter((room) => room.roomType === type)).map((room) =>
      roomCard(config, room, names),
    ),
    roomsToAdd: [],
    newRoomTypes: NEW_ROOM_TYPES,
  };
}

/**
 * The Landlord & rooms screen for First run's first save, before any version exists: every field blank, no saved
 * rooms, the master room to add, which can't be removed, and no heading above the cards, since it saves into the
 * first version.
 *
 * @returns The response for `GET /api/household/home-form`.
 */
export function buildFirstHomeForm(): HouseholdHomeFormResponse {
  return {
    title: "Rent & rooms",
    sub: "Rent, due dates and rooms",
    datedTitle: null,
    pendingNote: null,
    values: { landlordRentCents: null, landlordDueDay: null, billDueDay: null },
    rooms: [],
    roomsToAdd: [
      {
        roomType: "MASTER",
        title: ROOM_TITLES.MASTER,
        name: "Master room",
        airconUnits: null,
        rentCents: null,
        includeInTotal: null,
        calculatedRent: "—",
        occupants: "You",
        badge: null,
        canRemove: false,
      },
    ],
    newRoomTypes: NEW_ROOM_TYPES,
  };
}
