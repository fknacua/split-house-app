import type { ChargeType, HouseholdConfig, HouseholdEdit, HouseholdPersonEdit, PersonConfig } from "@splithouse/shared";
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
 * Applies one typed edit to a config. Touches only the dated values: name, WhatsApp and color live on
 * the `Person` row. The result still has to go through `householdConfigSchema`.
 *
 * @param config - The config the edit starts from. Not changed.
 * @param edit - The edit.
 * @returns The new config.
 */
export function applyHouseholdEdit(config: HouseholdConfig, edit: HouseholdEdit): HouseholdConfig {
  return {
    ...config,
    people: config.people.map((person) =>
      person.personId === edit.personId
        ? {
            ...person,
            rentCents: edit.rentCents ?? person.rentCents,
            depositCents: edit.depositCents ?? person.depositCents,
            dueDays: nextDueDays(person, edit),
            routes: nextRoutes(person, edit),
          }
        : person,
    ),
  };
}
