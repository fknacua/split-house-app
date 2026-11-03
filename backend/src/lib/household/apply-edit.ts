import type { ChargeType, HouseholdConfig, HouseholdPersonEdit, PersonConfig } from "@splithouse/shared";
import { viaOf } from "./route-via";

/** The due days after an edit. The utilities day also sets aircon, and an unchanged day leaves both as they are. */
function nextDueDays(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig["dueDays"] {
  const dueDays = { ...person.dueDays };
  if (edit.rentDueDay !== undefined) {
    if (edit.rentDueDay === null) delete dueDays.RENT;
    else dueDays.RENT = edit.rentDueDay;
  }
  if (edit.utilitiesDueDay !== undefined && edit.utilitiesDueDay !== (person.dueDays.UTILITIES ?? null)) {
    if (edit.utilitiesDueDay === null) {
      delete dueDays.UTILITIES;
      delete dueDays.AIRCON;
    } else {
      dueDays.UTILITIES = edit.utilitiesDueDay;
      dueDays.AIRCON = edit.utilitiesDueDay;
    }
  }
  return dueDays;
}

/** The routes after an edit. The utilities route also sets aircon, and an unchanged route leaves both as they are. */
function nextRoutes(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig["routes"] {
  const routes = { ...person.routes };
  const setRoute = (types: ChargeType[], via: string | null) => {
    for (const type of types) {
      // A missing entry means paid directly.
      if (via === null) delete routes[type];
      else routes[type] = { kind: "VIA", viaPersonId: via };
    }
  };
  if (edit.rentViaPersonId !== undefined && edit.rentViaPersonId !== viaOf(person, "RENT")) {
    setRoute(["RENT"], edit.rentViaPersonId);
  }
  if (edit.utilitiesViaPersonId !== undefined && edit.utilitiesViaPersonId !== viaOf(person, "UTILITIES")) {
    setRoute(["UTILITIES", "AIRCON"], edit.utilitiesViaPersonId);
  }
  return routes;
}

/**
 * Applies an edit's dated values to one person's config entry.
 *
 * @param person - The person's entry. Not changed.
 * @param edit - The edit.
 * @returns The new entry.
 */
export function applyPersonEdit(person: PersonConfig, edit: HouseholdPersonEdit): PersonConfig {
  return {
    ...person,
    depositCents: edit.depositCents ?? person.depositCents,
    dueDays: nextDueDays(person, edit),
    routes: nextRoutes(person, edit),
  };
}

/**
 * Applies one typed edit to a config. Touches only the dated values: name, WhatsApp and color live on
 * the `Person` row. Until 9.18 moves room rent to its own form, a rent edit writes to the tenant's room. The
 * result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param edit - The edit.
 * @returns The new config.
 */
export function applyHouseholdEdit(config: HouseholdConfig, edit: HouseholdPersonEdit): HouseholdConfig {
  const roomId = config.people.find((person) => person.personId === edit.personId)?.roomId;
  return {
    ...config,
    rooms: config.rooms.map((room) =>
      room.id === roomId && room.roomType === "TENANT" ? { ...room, rentCents: edit.rentCents ?? room.rentCents } : room,
    ),
    people: config.people.map((person) => (person.personId === edit.personId ? applyPersonEdit(person, edit) : person)),
  };
}

/**
 * Adds a tenant to a config. The utilities total grows by their shares, so everyone else's shares keep
 * their size. The aircon total stays, since the units stay in the house, so the owner and primary tenant
 * hand over the tenant's units. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param tenant - The new tenant's entry.
 * @returns The new config.
 */
export function applyAddPerson(config: HouseholdConfig, tenant: PersonConfig): HouseholdConfig {
  const { utilities } = config.categories;
  return {
    ...config,
    people: [...config.people, tenant],
    categories: {
      ...config.categories,
      utilities: { ...utilities, totalShares: utilities.totalShares + tenant.utilityShares },
    },
  };
}

/**
 * Takes a tenant out of a config, with their recurring charges, template overrides and section title. The
 * utilities total falls by their shares, so everyone else's shares keep their size. The aircon total stays, since
 * the units stay in the house, so the owner and primary tenant take them over. The result still has to go through
 * `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param personId - The tenant.
 * @returns The new config.
 */
export function applyRemovePerson(config: HouseholdConfig, personId: string): HouseholdConfig {
  const { utilities } = config.categories;
  const shares = config.people.find((p) => p.personId === personId)?.utilityShares ?? 0;
  return {
    ...config,
    people: config.people.filter((p) => p.personId !== personId),
    categories: {
      ...config.categories,
      utilities: { ...utilities, totalShares: utilities.totalShares - shares },
    },
    recurring: config.recurring.filter((r) => r.personId !== personId),
    templates: {
      ...config.templates,
      overrides: config.templates.overrides.filter((o) => o.personId !== personId),
      sectionTitles: Object.fromEntries(Object.entries(config.templates.sectionTitles).filter(([id]) => id !== personId)),
    },
  };
}
