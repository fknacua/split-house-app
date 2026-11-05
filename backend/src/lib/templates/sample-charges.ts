import { dateKeyToValue, dueDateKey, type HouseholdConfig } from "@splithouse/shared";
import { roomOf, totalAirconUnits } from "@/lib/household/room-amounts";
import { viaOf } from "@/lib/household/route-via";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { buildMonthCharges, buildUtilitiesCharges, splitShareCategory, type EngineCharge } from "@/lib/split/engine";

/** The bill total a preview splits, since the month's bill may not be saved yet. */
export const SAMPLE_BILL_CENTS = 41230;

/** The aircon servicing total a preview splits, since most months have none. */
const SAMPLE_AIRCON_CENTS = 11000;

/** Aircon split as a real servicing would be: each tenant's room's units, with the owner and primary tenant taking the rest. */
function sampleAirconCharges(config: HouseholdConfig, month: string): EngineCharge[] {
  const tenants = config.people.filter((p) => p.role === "TENANT" && roomOf(config, p.personId).airconUnits > 0);
  const amounts = splitShareCategory(
    SAMPLE_AIRCON_CENTS,
    totalAirconUnits(config),
    tenants.map((p) => ({ personId: p.personId, units: roomOf(config, p.personId).airconUnits })),
    {
      // The config schema requires an owner.
      ownerPersonId: config.people.find((p) => p.role === "OWNER")!.personId,
      primaryPersonId: config.people.find((p) => p.role === "PRIMARY")?.personId ?? null,
      primaryBps: config.categories.aircon.primaryBps,
    },
  );
  return config.people
    .filter((person) => (amounts[person.personId] ?? 0) !== 0)
    .map((person) => ({
      personId: person.personId,
      category: "AIRCON",
      label: "Aircon servicing",
      amountCents: amounts[person.personId],
      payViaPersonId: viaOf(person, "AIRCON"),
      dueDate: dueDateKey(month, person.dueDays.AIRCON),
    }));
}

/**
 * Everyone's charges for a preview, so every line the template can show is there to inspect, whatever the month holds
 * so far: rent and recurring charges from the config, with utilities and aircon split from sample totals through the
 * split engine. Nothing is stored and all of it reads as unpaid.
 *
 * @param config - The config the preview shows.
 * @param month - The month, `YYYY-MM`.
 * @returns The charges.
 */
export function buildSampleCharges(config: HouseholdConfig, month: string): BreakdownCharge[] {
  return [
    ...buildMonthCharges(config, month),
    ...buildUtilitiesCharges(config, { month, currentChargesCents: SAMPLE_BILL_CENTS }),
    ...sampleAirconCharges(config, month),
  ].map((charge) => ({
    ...charge,
    month,
    dueDate: charge.dueDate ? dateKeyToValue(charge.dueDate) : null,
    paidCents: null,
  }));
}
