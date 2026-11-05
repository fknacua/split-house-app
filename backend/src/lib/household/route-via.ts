import { formatDayOrdinal, type ChargeType, type HouseholdConfig, type HouseholdFormResponse, type PersonConfig } from "@splithouse/shared";

/**
 * The person a charge type goes via.
 *
 * @param person - The person's config.
 * @param type - The charge type.
 * @returns The other person's id, or null when it is paid directly.
 */
export function viaOf(person: PersonConfig, type: ChargeType): string | null {
  const route = person.routes[type];
  return route?.kind === "VIA" ? route.viaPersonId : null;
}

/** A person's routes that count. A recurring charge reads the utilities route, so a `RECURRING` entry does nothing. */
function usedRoutes(person: PersonConfig) {
  return Object.entries(person.routes)
    .filter(([type]) => type !== "RECURRING")
    .map(([, route]) => route);
}

/**
 * Whether anything of a person's goes via someone else, so nobody can pay via them.
 *
 * @param person - The person's config.
 * @returns True when any charge type has a via route.
 */
export function paysViaSomeone(person: PersonConfig): boolean {
  return usedRoutes(person).some((route) => route?.kind === "VIA");
}

/**
 * Whether anyone pays via a person, so that person has to pay directly.
 *
 * @param people - Everyone in the version.
 * @param personId - The person.
 * @returns True when anyone has a route via them.
 */
export function hasPayersVia(people: PersonConfig[], personId: string): boolean {
  return people.some((p) => usedRoutes(p).some((route) => route?.kind === "VIA" && route.viaPersonId === personId));
}

/**
 * Who a tenant's charge can be sent via: anyone in the version who pays directly, but them and the owner.
 *
 * @param people - Everyone in the version.
 * @param names - Everyone's names, by person id.
 * @param personId - The tenant, or null for one not in the version yet.
 * @returns The people to pick from.
 */
export function sentViaChoices(
  people: PersonConfig[],
  names: Map<string, string>,
  personId: string | null,
): HouseholdFormResponse["sentViaOptions"] {
  return people
    .filter((p) => p.personId !== personId && p.role !== "OWNER" && !paysViaSomeone(p))
    .map((p) => ({ personId: p.personId, name: names.get(p.personId) ?? "Someone" }));
}

/**
 * A fact label with the due day when one is set. Via someone, the day is that person's.
 *
 * @param config - The config in effect.
 * @param person - The person.
 * @param type - The charge type whose route and day to read.
 * @param label - The label.
 * @returns e.g. `Rent · due 28th`, or the label alone with no day.
 */
export function dueLabel(config: HouseholdConfig, person: PersonConfig, type: ChargeType, label: string): string {
  const via = viaOf(person, type);
  const payer = via ? config.people.find((p) => p.personId === via) : person;
  const day = payer?.dueDays[type];
  return day ? `${label} · due ${formatDayOrdinal(day)}` : label;
}

/**
 * A route as text, for View and the summary card.
 *
 * @param via - The person it goes via, or null when it is paid directly.
 * @param names - Everyone's names, by person id.
 * @returns e.g. `Directly`, `Via Priya`.
 */
export function routeText(via: string | null, names: Map<string, string>): string {
  return via ? `Via ${names.get(via) ?? "someone"}` : "Directly";
}
