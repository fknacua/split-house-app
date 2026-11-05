import type { HouseholdConfig, PersonConfig } from "@splithouse/shared";
import { splitRemainderByBps } from "@/lib/split/engine";
import { SHARE_SCALE } from "./amount-text";
import { masterRentCents, sharedAirconUnits } from "./room-amounts";

/** Who splits the remainder of each category, and each one's part of it. */
export interface Remainders {
  owner: PersonConfig;
  primary: PersonConfig | null;
  rent: { total: number; owner: number; primary: number };
  /** In thousandths of a share. */
  shares: { total: number; owner: number; primary: number };
  /** In thousandths of a unit, since a split can leave part of a unit. */
  units: { total: number; owner: number; primary: number };
}

/**
 * Splits rent, utility shares and aircon units between the owner and the primary tenant, by the engine's rule.
 *
 * @param config - A household config.
 * @returns Who they are and each one's part of each category.
 * @throws {Error} When the config has no owner.
 */
export function remaindersOf(config: HouseholdConfig): Remainders {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new Error("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;
  const { rent, utilities, aircon } = config.categories;

  const split = (total: number, primaryBps: number) => {
    const parts = splitRemainderByBps(total, owner.personId, primary?.personId ?? null, primaryBps);
    return { total, owner: parts[owner.personId], primary: primary ? parts[primary.personId] : 0 };
  };
  const tenantShares = config.people.reduce((sum, p) => sum + p.utilityShares, 0);

  return {
    owner,
    primary,
    rent: split(masterRentCents(config), rent.primaryBps),
    shares: split(utilities.totalShares - tenantShares, utilities.primaryBps),
    units: split(sharedAirconUnits(config) * SHARE_SCALE, aircon.primaryBps),
  };
}
