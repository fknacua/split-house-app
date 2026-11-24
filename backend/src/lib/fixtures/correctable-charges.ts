import type { CorrectableCharge } from "@/lib/add-charge/build-correction";
import { PERSON_IDS } from "./household";

const { alex, priya, sam, jordan } = PERSON_IDS;

/** A person who has left the household: their charges stay, but they aren't in November's config. */
const FORMER_TENANT_ID = "person-former";

const paid = (
  id: string,
  month: string,
  personId: string,
  category: CorrectableCharge["category"],
  label: string,
  amountCents: number,
  extra: Partial<CorrectableCharge> = {},
): CorrectableCharge => ({
  id,
  month,
  personId,
  category,
  label,
  amountCents,
  payViaPersonId: null,
  paidCents: amountCents,
  paidByPersonId: personId,
  correctionCents: [],
  ...extra,
});

/**
 * Charges as Correction mode reads them, on the sample household with November the newest opened month. Sample
 * amounts only. The first four can be corrected; the rest show each reason one can't.
 */
export const CORRECTABLE_CHARGES: CorrectableCharge[] = [
  // Sam's utilities and aircon go through Priya, who paid them.
  paid("sep-utilities-sam", "2026-09", sam, "UTILITIES", "Utilities", 8246, { payViaPersonId: priya, paidByPersonId: priya }),
  paid("oct-aircon-sam", "2026-10", sam, "AIRCON", "Aircon servicing", 1833, { payViaPersonId: priya, paidByPersonId: priya }),
  // Corrected once already, down $5.00.
  paid("oct-utilities-jordan", "2026-10", jordan, "UTILITIES", "Utilities", 8246, { correctionCents: [-500] }),
  paid("oct-fridge-jordan", "2026-10", jordan, "ONE_OFF", "Fridge repair", 3000),
  paid("oct-rent-jordan", "2026-10", jordan, "RENT", "Rent", 95000),
  paid("oct-correction-jordan", "2026-10", jordan, "CORRECTION", "Utilities correction (Sep)", 1500),
  paid("oct-utilities-alex", "2026-10", alex, "UTILITIES", "Utilities", 8246),
  paid("nov-utilities-jordan", "2026-11", jordan, "UTILITIES", "Utilities", 8000, { paidCents: null, paidByPersonId: null }),
  paid("sep-utilities-former", "2026-09", FORMER_TENANT_ID, "UTILITIES", "Utilities", 8246),
];

/**
 * The charges as the database returns them to the service, with each correction as a row.
 *
 * @param charges - Charges from {@link CORRECTABLE_CHARGES}.
 * @returns The rows.
 */
export function correctableRows(charges: CorrectableCharge[] = CORRECTABLE_CHARGES) {
  return charges.map(({ correctionCents, ...charge }) => ({ ...charge, corrections: correctionCents.map((amountCents) => ({ amountCents })) }));
}
