import type { HouseholdConfig, PersonColor, SetupPeopleResponse } from "@splithouse/shared";
import { buildPersonCards } from "@/lib/household/build-household-view";

/** What `buildPeoplePage` reads. */
export interface PeoplePageInput {
  /** First run's one version's config. */
  config: HouseholdConfig;
  /** Everyone's `Person` rows, for names and colors. */
  people: { id: string; name: string; color: PersonColor }[];
}

const ADD = { kind: "add-person" } as const;

/**
 * First run's People page, display-ready. The cards are Household's, each with View and Edit, without the owner's:
 * the page lists who pays you. `Save people` is allowed once anyone besides the owner is in.
 *
 * @param input - The config and everyone's rows.
 * @returns The response for `GET /api/setup/people`.
 */
export function buildPeoplePage({ config, people }: PeoplePageInput): SetupPeopleResponse {
  const others = config.people.filter((p) => p.role !== "OWNER").map((p) => p.personId);
  const cards = buildPersonCards({ config, people, editablePersonIds: new Set(others) }).filter((card) =>
    others.includes(card.personId),
  );
  const hasPeople = cards.length > 0;

  return {
    title: "People",
    sub: "Who pays you",
    heading: "People",
    people: cards,
    empty: hasPeople ? null : { text: "No people yet", add: { label: "Add person", target: ADD } },
    addMore: hasPeople ? { label: "Add more", target: ADD } : null,
    save: { label: "Save people", enabled: hasPeople },
  };
}
