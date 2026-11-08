import type { HouseholdEditRow } from "@splithouse/shared";

/** The text for a value that isn't set, such as a cleared due day. */
const NONE = "—";

/**
 * The summary card's rows: only what changed, and with no before value where there was none (a room, a charge or a
 * WhatsApp number added, a due day first set), so the card shows just the new value instead of a struck-through `—`.
 *
 * @param rows - Every row the planner worked out, changed or not.
 * @returns The changed rows, with `from` null where it was `—`.
 */
export function changedRows(rows: HouseholdEditRow[]): HouseholdEditRow[] {
  return rows
    .filter((row) => row.from !== row.to)
    .map((row) => ({ ...row, from: row.from === NONE ? null : row.from }));
}
