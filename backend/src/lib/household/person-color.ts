import { TENANT_PERSON_COLORS, type PersonColor } from "@splithouse/shared";

/**
 * The default color for a new person: the first one nobody uses yet, skipping Teal, which is only
 * for the owner. Blue when all are taken, since duplicates are allowed.
 *
 * @param used - The colors already in use.
 * @returns The color to give the new person.
 */
export function nextPersonColor(used: Iterable<PersonColor>): PersonColor {
  const taken = new Set(used);
  return TENANT_PERSON_COLORS.find((color) => !taken.has(color)) ?? "BLUE";
}
