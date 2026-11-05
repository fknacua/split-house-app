import { formatCents, type HouseholdConfig, type HouseholdSplitAmounts, type HouseholdSplitCountAmount } from "@splithouse/shared";
import { amountText, countText } from "./amount-text";
import { masterRentCents } from "./room-amounts";
import { remaindersOf } from "./split-remainders";

const NONE = "—";

/** One card split by count. With nothing left, the amounts read `—` and the counts 0. */
function countAmount(
  part: { total: number; owner: number; primary: number },
  hasPrimary: boolean,
  word: string,
): HouseholdSplitCountAmount {
  const hasLeft = part.total > 0;
  return {
    left: amountText(Math.max(part.total, 0)),
    owner: hasLeft ? countText(part.owner, word) : NONE,
    primary: hasPrimary ? (hasLeft ? countText(part.primary, word) : NONE) : null,
    counts: {
      left: Math.max(part.total, 0),
      owner: hasLeft ? part.owner : 0,
      primary: hasPrimary ? (hasLeft ? part.primary : 0) : null,
    },
  };
}

/**
 * What the Household split cards work out, on the form and on each preview.
 *
 * @param config - The config, which on a preview can still hold an empty field read as 0.
 * @returns What is left to split on each card and each person's part of it.
 * @throws {Error} When the config has no owner.
 */
export function splitAmounts(config: HouseholdConfig): HouseholdSplitAmounts {
  const { primary, rent, shares, units } = remaindersOf(config);
  return {
    rent: {
      left: formatCents(masterRentCents(config)),
      owner: formatCents(rent.owner),
      primary: primary ? formatCents(rent.primary) : null,
    },
    utilities: countAmount(shares, primary !== null, "share"),
    aircon: countAmount(units, primary !== null, "unit"),
  };
}
