import type { ChargeType, PersonConfig } from "@splithouse/shared";

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

/**
 * Whether anything of a person's goes via someone else, so nobody can pay via them.
 *
 * @param person - The person's config.
 * @returns True when any charge type has a via route.
 */
export function paysViaSomeone(person: PersonConfig): boolean {
  return Object.values(person.routes).some((route) => route?.kind === "VIA");
}

/**
 * Whether anyone pays via a person, so that person has to pay directly.
 *
 * @param people - Everyone in the version.
 * @param personId - The person.
 * @returns True when anyone has a route via them.
 */
export function hasPayersVia(people: PersonConfig[], personId: string): boolean {
  return people.some((p) =>
    Object.values(p.routes).some((route) => route?.kind === "VIA" && route.viaPersonId === personId),
  );
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
