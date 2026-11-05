import { formatCents, type HouseholdConfig, type HouseholdSplitAmounts } from "@splithouse/shared";
import { amountText, countText } from "./amount-text";
import { masterRentCents, sharedAirconUnits } from "./room-amounts";
import { remaindersOf } from "./split-remainders";

const NONE = "—";

/**
 * What the Household split cards work out, on the form and on each preview.
 *
 * @param config - The config, which on a preview can still hold an empty field read as 0.
 * @returns What is left to split on each card and each person's part of it.
 * @throws {Error} When the config has no owner.
 */
export function splitAmounts(config: HouseholdConfig): HouseholdSplitAmounts {
  const { primary, rent, shares, units } = remaindersOf(config);
  const hasShares = shares.total > 0;
  return {
    rent: {
      left: formatCents(masterRentCents(config)),
      owner: formatCents(rent.owner),
      primary: primary ? formatCents(rent.primary) : null,
    },
    utilities: {
      left: amountText(Math.max(shares.total, 0)),
      owner: hasShares ? countText(shares.owner, "share") : NONE,
      primary: primary ? (hasShares ? countText(shares.primary, "share") : NONE) : null,
    },
    aircon: {
      left: String(sharedAirconUnits(config)),
      owner: countText(units.owner, "unit"),
      primary: primary ? countText(units.primary, "unit") : null,
    },
  };
}
