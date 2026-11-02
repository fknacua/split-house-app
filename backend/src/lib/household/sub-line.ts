import { CHARGE_TYPES, type ChargeType, type HouseholdConfig } from "@splithouse/shared";

/** How a charge type reads in running text, e.g. "utilities and aircon via Priya". */
export const ROUTE_WORDS: Record<ChargeType, string> = {
  RENT: "rent",
  UTILITIES: "utilities",
  AIRCON: "aircon",
  RECURRING: "other charges",
};

/**
 * Joins words the way a sentence does.
 *
 * @param words - The words.
 * @param conjunction - The word before the last one.
 * @returns `a`, `a and b`, or `a, b and c`.
 */
export function joinWords(words: string[], conjunction = "and"): string {
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} ${conjunction} ${words.at(-1)}`;
}

/**
 * A person's sub line from the config: the room from the role, then how they pay.
 *
 * @param config - The config pinned to the month.
 * @param personId - The person.
 * @param names - Names by person id.
 * @returns e.g. `Master room · pays you directly`, `Own room · utilities and aircon via Priya`, or
 * for the owner `Master room · pays landlord & utilities`.
 */
export function personSubLine(config: HouseholdConfig, personId: string, names: Map<string, string>): string {
  const person = config.people.find((p) => p.personId === personId);
  if (person?.role === "OWNER") return "Master room · pays landlord & utilities";
  const room = person?.role === "PRIMARY" ? "Master room" : "Own room";
  const viaTypes = new Map<string, ChargeType[]>();
  for (const type of CHARGE_TYPES) {
    const route = person?.routes[type];
    if (route?.kind === "VIA") viaTypes.set(route.viaPersonId, [...(viaTypes.get(route.viaPersonId) ?? []), type]);
  }
  if (viaTypes.size === 0) return `${room} · pays you directly`;
  const routes = [...viaTypes].map(
    ([viaId, types]) => `${joinWords(types.map((t) => ROUTE_WORDS[t]))} via ${names.get(viaId) ?? "someone"}`,
  );
  return `${room} · ${routes.join(", ")}`;
}
