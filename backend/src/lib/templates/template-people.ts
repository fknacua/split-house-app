import type { HouseholdConfig, PersonColor } from "@splithouse/shared";

/** How each role reads on the landing cards and the For who rows. The owner sends the messages and has no template. */
const ROLE_NAMES = { PRIMARY: "Primary Tenant", TENANT: "Tenant" } as const;

const FALLBACK_COLOR: PersonColor = "SLATE";

/** Someone who can have a custom template, with what the landing page and the editor show of them. */
export interface TemplatePerson {
  personId: string;
  name: string;
  initial: string;
  color: PersonColor;
  /** `Primary Tenant` or `Tenant`. */
  role: string;
  /** e.g. `Room 3`. */
  room: string;
  /** The config they are in: next month's, else this month's for someone leaving. Their preview is built from it. */
  config: HouseholdConfig;
}

/**
 * Who can have a custom template: anyone in next month's or this month's household but the owner, who sends the
 * messages. Someone leaving next month still gets this month's messages, and a new tenant is due theirs soon. The
 * primary tenant comes first, then the tenants in config order.
 *
 * @param configs - Next month's config, then the active month's when there is one.
 * @param people - Everyone's `Person` rows, for the names and colours.
 * @returns The people, each with the config they are found in first.
 */
export function templatePeople(
  configs: HouseholdConfig[],
  people: { id: string; name: string; color?: PersonColor }[],
): TemplatePerson[] {
  const rows = new Map(people.map((p) => [p.id, p]));
  const found = new Map<string, TemplatePerson>();
  for (const config of configs) {
    for (const person of config.people) {
      if (person.role === "OWNER" || found.has(person.personId)) continue;
      const name = rows.get(person.personId)?.name ?? "Someone";
      found.set(person.personId, {
        personId: person.personId,
        name,
        initial: (Array.from(name.trim())[0] ?? "?").toUpperCase(),
        color: rows.get(person.personId)?.color ?? FALLBACK_COLOR,
        role: ROLE_NAMES[person.role],
        room: config.rooms.find((r) => r.id === person.roomId)?.name ?? "",
        config,
      });
    }
  }
  const all = [...found.values()];
  return [...all.filter((p) => p.role === ROLE_NAMES.PRIMARY), ...all.filter((p) => p.role !== ROLE_NAMES.PRIMARY)];
}

/**
 * Who the Default is previewed on: the primary tenant, whose message is the fullest, else the first tenant.
 *
 * @param people - From `templatePeople`.
 * @returns The person, or undefined when only the owner is in the household.
 */
export function defaultPreviewPerson(people: TemplatePerson[]): TemplatePerson | undefined {
  return people[0];
}
