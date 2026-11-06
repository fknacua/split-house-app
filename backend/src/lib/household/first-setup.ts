import type { HouseholdConfig } from "@splithouse/shared";
import { SHARE_SCALE } from "./amount-text";

const WHOLE_BPS = 10000;
/** The primary tenant's part of every split when they join in First run: half. */
export const FIRST_PRIMARY_BPS = 5000;

/**
 * The config the first Rent & rooms save starts from, before any version exists: the owner alone in the master room,
 * taking all of every split, with one utility share. Not valid by itself: the edit adds the master room, the landlord
 * rent and its due day.
 *
 * @param ownerId - The owner's `Person` id.
 * @param masterRoomId - The id the master room being added takes.
 * @returns The starting config.
 */
export function emptyHouseholdConfig(ownerId: string, masterRoomId: string): HouseholdConfig {
  const ownerTakesAll = { ownerBps: WHOLE_BPS, primaryBps: 0 };
  return {
    rooms: [],
    people: [{ personId: ownerId, role: "OWNER", roomId: masterRoomId, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 }],
    categories: {
      rent: { ...ownerTakesAll, landlordRentCents: 0, landlordDueDay: 1 },
      utilities: { ...ownerTakesAll, totalShares: SHARE_SCALE },
      aircon: ownerTakesAll,
    },
    recurring: [],
  };
}

/**
 * Sets the rent, utilities and aircon splits to one primary tenant's part, the owner taking the rest.
 *
 * @param config - The config. Not changed.
 * @param primaryBps - The primary tenant's part, in basis points: 0 when there is none.
 * @returns The new config.
 */
export function withPrimarySplit(config: HouseholdConfig, primaryBps: number): HouseholdConfig {
  const split = { ownerBps: WHOLE_BPS - primaryBps, primaryBps };
  const { rent, utilities, aircon } = config.categories;
  return {
    ...config,
    categories: { rent: { ...rent, ...split }, utilities: { ...utilities, ...split }, aircon: { ...aircon, ...split } },
  };
}
