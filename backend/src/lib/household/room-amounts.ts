import type { HouseholdConfig, HouseholdRoom, PersonConfig } from "@splithouse/shared";

function isOccupied(config: HouseholdConfig, roomId: string): boolean {
  return config.people.some((person) => person.roomId === roomId);
}

/**
 * The master room's rent, which is calculated and never stored: landlord rent minus the rent of
 * occupied tenant rooms with "Include in total" on. An empty room is not subtracted, so the owner
 * and primary tenant cover it until someone moves in.
 *
 * @param config - A parsed household config.
 * @returns The master room's rent in cents. The config schema refuses a value below zero.
 */
export function masterRentCents(config: HouseholdConfig): number {
  return config.rooms.reduce(
    (rent, room) =>
      room.roomType === "TENANT" && room.includeInTotal && isOccupied(config, room.id)
        ? rent - room.rentCents
        : rent,
    config.categories.rent.landlordRentCents,
  );
}

/**
 * The household's aircon total.
 *
 * @param config - A parsed household config.
 * @returns The sum of every room's aircon units.
 */
export function totalAirconUnits(config: HouseholdConfig): number {
  return config.rooms.reduce((units, room) => units + room.airconUnits, 0);
}

/**
 * The aircon units the owner and primary tenant split: every unit not in an occupied tenant room,
 * so the master, common and empty rooms.
 *
 * @param config - A parsed household config.
 * @returns The number of units.
 */
export function sharedAirconUnits(config: HouseholdConfig): number {
  return config.rooms.reduce(
    (units, room) =>
      room.roomType === "TENANT" && isOccupied(config, room.id) ? units : units + room.airconUnits,
    0,
  );
}

/**
 * The rooms stat on the Household overview.
 *
 * @param config - A parsed household config.
 * @returns The number of master and tenant rooms, occupied or not. Common rooms do not count.
 */
export function roomCount(config: HouseholdConfig): number {
  return config.rooms.filter((room) => room.roomType !== "COMMON").length;
}

/**
 * Finds the room a person is in.
 *
 * @param config - A parsed household config.
 * @param personId - The person to look up.
 * @returns The person's room.
 * @throws {Error} When the person is not in this config.
 */
export function roomOf(config: HouseholdConfig, personId: string): HouseholdRoom {
  const person = config.people.find((p) => p.personId === personId);
  const room = config.rooms.find((r) => r.id === person?.roomId);
  if (!room) throw new Error(`No room for person ${personId}`);
  return room;
}

/**
 * Lists the people in a room.
 *
 * @param config - A parsed household config.
 * @param roomId - The room to look up.
 * @returns The room's people, in config order. Empty for an empty or common room.
 */
export function peopleIn(config: HouseholdConfig, roomId: string): PersonConfig[] {
  return config.people.filter((person) => person.roomId === roomId);
}
