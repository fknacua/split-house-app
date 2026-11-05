import type {
  ChargeType,
  HouseholdConfig,
  HouseholdHomeEdit,
  HouseholdNewRoom,
  HouseholdPersonEdit,
  HouseholdRoom,
  HouseholdRoomEdit,
  HouseholdSplitEdit,
  PersonConfig,
} from "@splithouse/shared";
import { SHARE_SCALE } from "./amount-text";
import { sharedAirconUnits } from "./room-amounts";
import { viaOf } from "./route-via";

/** The due days after an edit. The utilities day also sets aircon, and an unchanged day leaves both as they are. */
function nextDueDays(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig["dueDays"] {
  const dueDays = { ...person.dueDays };
  if (edit.rentDueDay !== undefined) {
    if (edit.rentDueDay === null) delete dueDays.RENT;
    else dueDays.RENT = edit.rentDueDay;
  }
  if (edit.utilitiesDueDay !== undefined && edit.utilitiesDueDay !== (person.dueDays.UTILITIES ?? null)) {
    if (edit.utilitiesDueDay === null) {
      delete dueDays.UTILITIES;
      delete dueDays.AIRCON;
    } else {
      dueDays.UTILITIES = edit.utilitiesDueDay;
      dueDays.AIRCON = edit.utilitiesDueDay;
    }
  }
  return dueDays;
}

/** The routes after an edit. The utilities route also sets aircon, and an unchanged route leaves both as they are. */
function nextRoutes(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig["routes"] {
  const routes = { ...person.routes };
  const setRoute = (types: ChargeType[], via: string | null) => {
    for (const type of types) {
      // A missing entry means paid directly.
      if (via === null) delete routes[type];
      else routes[type] = { kind: "VIA", viaPersonId: via };
    }
  };
  if (edit.rentViaPersonId !== undefined && edit.rentViaPersonId !== viaOf(person, "RENT")) {
    setRoute(["RENT"], edit.rentViaPersonId);
  }
  if (edit.utilitiesViaPersonId !== undefined && edit.utilitiesViaPersonId !== viaOf(person, "UTILITIES")) {
    setRoute(["UTILITIES", "AIRCON"], edit.utilitiesViaPersonId);
  }
  return routes;
}

/**
 * Applies an edit's dated values to one person's config entry.
 *
 * @param person - The person's entry. Not changed.
 * @param edit - The edit.
 * @returns The new entry.
 */
export function applyPersonEdit(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig {
  return {
    ...person,
    depositCents: edit.depositCents ?? person.depositCents,
    dueDays: nextDueDays(person, edit),
    routes: nextRoutes(person, edit),
  };
}

/**
 * Applies one typed edit to a config. Touches only the dated values: name, WhatsApp and color live on
 * the `Person` row. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param edit - The edit.
 * @returns The new config.
 */
export function applyHouseholdEdit(config: HouseholdConfig, edit: HouseholdPersonEdit): HouseholdConfig {
  return {
    ...config,
    people: config.people.map((person) => (person.personId === edit.personId ? applyPersonEdit(person, edit) : person)),
  };
}

/** A saved room after an edit. A cleared field keeps its saved value, since the plan refuses it first. */
function applyRoomEdit(room: HouseholdRoom, edit: HouseholdRoomEdit | undefined): HouseholdRoom {
  if (!edit) return room;
  const shared = { name: edit.name ?? room.name, airconUnits: edit.airconUnits ?? room.airconUnits };
  if (room.roomType !== "TENANT") return { ...room, ...shared };
  return {
    ...room,
    ...shared,
    rentCents: edit.rentCents ?? room.rentCents,
    includeInTotal: edit.includeInTotal ?? room.includeInTotal,
  };
}

/** A new room's entry. An empty field reads as 0, since the plan refuses it first. */
function newRoom(room: HouseholdNewRoom, id: string): HouseholdRoom {
  const units = room.airconUnits ?? 0;
  return room.roomType === "TENANT"
    ? { ...room, id, airconUnits: units, rentCents: room.rentCents ?? 0 }
    : { ...room, id, airconUnits: units };
}

/**
 * Applies a Landlord & rooms edit to a config. Master rent and the aircon total are worked out from the
 * result, so nothing else changes. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param edit - The edit.
 * @param newRoomIds - The id for each of `edit.newRooms`, in order.
 * @returns The new config, with new rooms after the saved ones.
 */
export function applyHomeEdit(config: HouseholdConfig, edit: HouseholdHomeEdit, newRoomIds: string[]): HouseholdConfig {
  const { rent, utilities } = config.categories;
  const { billDueDay: savedBillDueDay, ...utilitiesRest } = utilities;
  const billDueDay = edit.billDueDay === undefined ? savedBillDueDay : (edit.billDueDay ?? undefined);
  return {
    ...config,
    rooms: [
      ...config.rooms
        .filter((room) => !edit.removedRoomIds.includes(room.id))
        .map((room) =>
          applyRoomEdit(
            room,
            edit.rooms.find((e) => e.id === room.id),
          ),
        ),
      ...edit.newRooms.map((room, i) => newRoom(room, newRoomIds[i])),
    ],
    categories: {
      ...config.categories,
      rent: {
        ...rent,
        landlordRentCents: edit.landlordRentCents ?? rent.landlordRentCents,
        landlordDueDay: edit.landlordDueDay ?? rent.landlordDueDay,
      },
      utilities: billDueDay === undefined ? utilitiesRest : { ...utilitiesRest, billDueDay },
    },
  };
}

/** A category after an edit to the primary tenant's percent, with the owner taking the rest. A cleared one keeps its saved value. */
function applyPrimaryBps<T extends { ownerBps: number; primaryBps: number }>(category: T, primaryBps: number | null | undefined): T {
  return primaryBps === null || primaryBps === undefined ? category : { ...category, primaryBps, ownerBps: 10000 - primaryBps };
}

/** The percent a typed count comes to. Null for a count the plan refuses or nothing to split, which keeps the saved percent. */
function primaryBpsFromCount(count: number | null | undefined, left: number): number | null {
  if (count === null || count === undefined || left <= 0 || count < 0 || count > left) return null;
  return Math.round((count / left) * 10000);
}

/**
 * Applies a Household split edit to a config. An empty shares field reads as 0, since the plan refuses it first and
 * the preview still works out the amounts from the rest. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param edit - The edit.
 * @returns The new config.
 */
export function applySplitEdit(config: HouseholdConfig, edit: HouseholdSplitEdit): HouseholdConfig {
  const { rent, utilities, aircon } = config.categories;
  const people = config.people.map((person) => {
    const sent = edit.tenantShares.find((t) => t.personId === person.personId);
    return sent && person.role === "TENANT" ? { ...person, utilityShares: sent.utilityShares ?? 0 } : person;
  });
  const totalShares = edit.totalShares === undefined ? utilities.totalShares : (edit.totalShares ?? 0);
  const left = totalShares - people.reduce((sum, p) => sum + p.utilityShares, 0);
  return {
    ...config,
    people,
    categories: {
      rent: applyPrimaryBps(rent, edit.rentPrimaryBps),
      utilities: { ...applyPrimaryBps(utilities, primaryBpsFromCount(edit.utilitiesPrimaryShares, left)), totalShares },
      aircon: applyPrimaryBps(aircon, primaryBpsFromCount(edit.airconPrimaryUnits, sharedAirconUnits(config) * SHARE_SCALE)),
    },
  };
}

/**
 * Adds a tenant to a config. The utilities total grows by their shares, so everyone else's shares keep
 * their size. The aircon total stays, since the units stay in the house, so the owner and primary tenant
 * hand over the tenant's units. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param tenant - The new tenant's entry.
 * @returns The new config.
 */
export function applyAddPerson(config: HouseholdConfig, tenant: PersonConfig): HouseholdConfig {
  const { utilities } = config.categories;
  return {
    ...config,
    people: [...config.people, tenant],
    categories: {
      ...config.categories,
      utilities: { ...utilities, totalShares: utilities.totalShares + tenant.utilityShares },
    },
  };
}

/**
 * Adds a recurring charge to a config, or replaces the saved one with its id, keeping its place in the list. The
 * result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param charge - The charge.
 * @returns The new config.
 */
export function applyRecurringCharge(config: HouseholdConfig, charge: HouseholdConfig["recurring"][number]): HouseholdConfig {
  const isSaved = config.recurring.some((r) => r.id === charge.id);
  return {
    ...config,
    recurring: isSaved ? config.recurring.map((r) => (r.id === charge.id ? charge : r)) : [...config.recurring, charge],
  };
}

/**
 * Takes a tenant out of a config, with their recurring charges. Their room stays, now empty, keeping its rent for the next tenant. The utilities total falls by their shares, so everyone
 * else's shares keep their size. The aircon total stays, since the units stay in the house, so the owner and primary
 * tenant take them over. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param personId - The tenant.
 * @returns The new config.
 */
export function applyRemovePerson(config: HouseholdConfig, personId: string): HouseholdConfig {
  const { utilities } = config.categories;
  const shares = config.people.find((p) => p.personId === personId)?.utilityShares ?? 0;
  return {
    ...config,
    people: config.people.filter((p) => p.personId !== personId),
    categories: {
      ...config.categories,
      utilities: { ...utilities, totalShares: utilities.totalShares - shares },
    },
    recurring: config.recurring.filter((r) => r.personId !== personId),
  };
}
