import type { HouseholdAction, HouseholdTarget, SetupPeopleResponse } from '@splithouse/shared';

/** Props for {@link PeopleForm}. */
export interface PeopleFormProps {
  /** The page as the server wrote it. */
  page: SetupPeopleResponse;
}

/** Props for {@link PeopleEmptyCard}. */
export interface PeopleEmptyCardProps {
  /** `No people yet`. */
  text: string;
  /** `Add person`. */
  add: HouseholdAction;
  onOpen: (target: HouseholdTarget) => void;
}
