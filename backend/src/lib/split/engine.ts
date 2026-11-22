import { dueDateKey, type ChargeType, type HouseholdConfig, type PersonConfig } from "@splithouse/shared";
import { masterRentCents, roomOf, totalAirconUnits } from "@/lib/household/room-amounts";

// Pure split engine (see docs/SplitHouse — Data Model.md "Split engine" and
// "Rounding rule"). No Prisma, no Date.now: every input is passed in.
// Rounding rule: everyone except Francis (the owner) is rounded to the nearest
// cent, half up. Francis's amount is always a remainder, so a category's parts
// add up exactly to its total.

export class SplitEngineError extends Error {}

export interface EngineCharge {
  personId: string;
  category: ChargeType | "ONE_OFF";
  label: string;
  amountCents: number;
  payViaPersonId: string | null;
  dueDate: string | null;
}

export interface SharePart {
  personId: string;
  units: number;
}

export interface CustomPart {
  personId: string;
  amountCents: number;
}

export interface RemainderConfig {
  ownerPersonId: string;
  primaryPersonId: string | null;
  primaryBps: number;
}

function roundCents(value: number): number {
  return Math.round(value);
}

function splitProportional(
  totalCents: number,
  totalUnits: number,
  parts: SharePart[],
): Record<string, number> {
  const sumUnits = parts.reduce((s, p) => s + p.units, 0);
  if (sumUnits > totalUnits) {
    throw new SplitEngineError(`Shares/units (${sumUnits}) exceed the total (${totalUnits})`);
  }
  const result: Record<string, number> = {};
  for (const part of parts) {
    result[part.personId] = roundCents((totalCents * part.units) / totalUnits);
  }
  return result;
}

// Per-share and per-unit splits round proportionally; identical mechanics,
// kept as two names so callers can say what the "Who" split is based on.
export function splitByShares(
  totalCents: number,
  totalShares: number,
  parts: SharePart[],
): Record<string, number> {
  return splitProportional(totalCents, totalShares, parts);
}

export function splitByUnits(
  totalCents: number,
  totalUnits: number,
  parts: SharePart[],
): Record<string, number> {
  return splitProportional(totalCents, totalUnits, parts);
}

/**
 * Splits a total evenly across everyone in it, for an Add charge one-off split `EQUAL`. Everyone
 * except the owner is rounded to the nearest cent, half up; the owner gets the remainder, so the
 * parts add up exactly to the total.
 *
 * @param totalCents - The total to split.
 * @param personIds - Everyone in the split, the owner included.
 * @param ownerPersonId - The owner, who takes the remainder.
 * @returns Each person's amount, by person id.
 * @throws SplitEngineError when the owner is not in `personIds` or a person is listed twice.
 */
export function splitEqual(totalCents: number, personIds: string[], ownerPersonId: string): Record<string, number> {
  if (!personIds.includes(ownerPersonId)) throw new SplitEngineError("The owner must be in an equal split");
  if (new Set(personIds).size !== personIds.length) throw new SplitEngineError("A person is listed twice in an equal split");
  const each = roundCents(totalCents / personIds.length);
  const result: Record<string, number> = {};
  for (const personId of personIds) {
    if (personId !== ownerPersonId) result[personId] = each;
  }
  const othersSum = Object.values(result).reduce((s, v) => s + v, 0);
  result[ownerPersonId] = totalCents - othersSum;
  return result;
}

/**
 * Splits a total by each person's weight (shares in thousandths, for an Add charge one-off split `PER_SHARE`):
 * everyone except the owner gets the total times their weight over the sum, rounded to the nearest cent, half up;
 * the owner gets the remainder, so the parts add up exactly to the total.
 *
 * @param totalCents - The total to split.
 * @param parts - Everyone in the split with their weight, the owner included.
 * @param ownerPersonId - The owner, who takes the remainder.
 * @returns Each person's amount, by person id.
 * @throws SplitEngineError when the owner is not in `parts`, a weight is below 0, or every weight is 0.
 */
export function splitByWeights(totalCents: number, parts: SharePart[], ownerPersonId: string): Record<string, number> {
  if (!parts.some((p) => p.personId === ownerPersonId)) throw new SplitEngineError("The owner must be in a weighted split");
  if (parts.some((p) => p.units < 0)) throw new SplitEngineError("A share can't be below 0");
  const sum = parts.reduce((s, p) => s + p.units, 0);
  if (sum <= 0) throw new SplitEngineError("At least one share must be above 0");
  const result: Record<string, number> = {};
  for (const part of parts) {
    if (part.personId !== ownerPersonId) result[part.personId] = roundCents((totalCents * part.units) / sum);
  }
  const othersSum = Object.values(result).reduce((s, v) => s + v, 0);
  result[ownerPersonId] = totalCents - othersSum;
  return result;
}

export function splitCustom(totalCents: number, parts: CustomPart[]): Record<string, number> {
  const sum = parts.reduce((s, p) => s + p.amountCents, 0);
  if (sum !== totalCents) {
    throw new SplitEngineError(`Custom amounts (${sum}) do not add up to the total (${totalCents})`);
  }
  const result: Record<string, number> = {};
  for (const part of parts) result[part.personId] = part.amountCents;
  return result;
}

// The remainder of a category (what tenant shares/units don't cover, or the
// whole category for rent's shared room) is split between owner and primary
// by basis points. The owner's amount is always the remainder of this split,
// not an independently rounded share.
export function splitRemainderByBps(
  totalCents: number,
  ownerPersonId: string,
  primaryPersonId: string | null,
  primaryBps: number,
): Record<string, number> {
  const primaryAmount = primaryPersonId ? roundCents((totalCents * primaryBps) / 10000) : 0;
  const ownerAmount = totalCents - primaryAmount;
  const result: Record<string, number> = { [ownerPersonId]: ownerAmount };
  if (primaryPersonId) result[primaryPersonId] = primaryAmount;
  return result;
}

// A category (rent's shared room, utilities, aircon) split between tenant
// shares/units and the owner/primary remainder. Used by buildUtilitiesCharges
// and, later, the aircon one-off split (Phase 9A); exported so both and their
// tests share one composition of the rounding rule.
export function splitShareCategory(
  totalCents: number,
  totalShares: number,
  tenantParts: SharePart[],
  remainder: RemainderConfig,
): Record<string, number> {
  const tenantAmounts = splitByShares(totalCents, totalShares, tenantParts);
  const tenantSum = Object.values(tenantAmounts).reduce((s, v) => s + v, 0);
  const remainderAmounts = splitRemainderByBps(
    totalCents - tenantSum,
    remainder.ownerPersonId,
    remainder.primaryPersonId,
    remainder.primaryBps,
  );
  return { ...tenantAmounts, ...remainderAmounts };
}

function routeFor(person: PersonConfig, type: ChargeType): string | null {
  const route = person.routes[type];
  return route?.kind === "VIA" ? route.viaPersonId : null;
}

/** The owner/primary remainder config for a category's primary tenant percent. */
function remainderOf(config: HouseholdConfig, primaryBps: number): RemainderConfig {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new SplitEngineError("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;
  return { ownerPersonId: owner.personId, primaryPersonId: primary?.personId ?? null, primaryBps };
}

/**
 * A total split by utility shares: each tenant's shares, with the owner and primary tenant splitting the rest by the
 * utilities percent. Used for a bill's utilities and a one-off split `PER_SHARE`.
 *
 * @param config - The pinned config.
 * @param totalCents - The total to split.
 * @returns Each person's amount, by person id.
 * @throws SplitEngineError when the config has no owner or the tenants' shares exceed the total.
 */
export function utilityShareAmounts(config: HouseholdConfig, totalCents: number): Record<string, number> {
  const tenants = config.people.filter((p) => p.role === "TENANT" && p.utilityShares > 0);
  return splitShareCategory(
    totalCents,
    config.categories.utilities.totalShares,
    tenants.map((p) => ({ personId: p.personId, units: p.utilityShares })),
    remainderOf(config, config.categories.utilities.primaryBps),
  );
}

/**
 * A total split by aircon units: each tenant's room's units, with the owner and primary tenant splitting the rest (the
 * master, common and empty rooms' units) by the aircon percent.
 *
 * @param config - The pinned config.
 * @param totalCents - The total to split.
 * @returns Each person's amount, by person id.
 * @throws SplitEngineError when the config has no owner.
 */
export function airconUnitAmounts(config: HouseholdConfig, totalCents: number): Record<string, number> {
  const tenants = config.people.filter((p) => p.role === "TENANT" && roomOf(config, p.personId).airconUnits > 0);
  return splitShareCategory(
    totalCents,
    totalAirconUnits(config),
    tenants.map((p) => ({ personId: p.personId, units: roomOf(config, p.personId).airconUnits })),
    remainderOf(config, config.categories.aircon.primaryBps),
  );
}

function personOrThrow(config: HouseholdConfig, personId: string): PersonConfig {
  const person = config.people.find((p) => p.personId === personId);
  if (!person) throw new SplitEngineError(`Unknown person ${personId}`);
  return person;
}

// Rent (each tenant's room rent plus the master room split) and recurring
// charges for a month, from the household config alone.
export function buildMonthCharges(config: HouseholdConfig, month: string): EngineCharge[] {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new SplitEngineError("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;

  const charges: EngineCharge[] = [];

  for (const person of config.people) {
    const room = roomOf(config, person.personId);
    if (room.roomType === "TENANT" && room.rentCents > 0) {
      charges.push({
        personId: person.personId,
        category: "RENT",
        label: "Rent",
        amountCents: room.rentCents,
        payViaPersonId: routeFor(person, "RENT"),
        dueDate: dueDateKey(month, person.dueDays.RENT),
      });
    }
  }

  const sharedRent = splitRemainderByBps(
    masterRentCents(config),
    owner.personId,
    primary?.personId ?? null,
    config.categories.rent.primaryBps,
  );
  for (const [personId, amountCents] of Object.entries(sharedRent)) {
    // A 0% split leaves nothing to charge, as with a tenant room at no rent.
    if (amountCents === 0) continue;
    const person = personOrThrow(config, personId);
    charges.push({
      personId,
      category: "RENT",
      label: "Rent",
      amountCents,
      payViaPersonId: routeFor(person, "RENT"),
      dueDate: dueDateKey(month, person.dueDays.RENT),
    });
  }

  for (const recurring of config.recurring) {
    if (recurring.endMonth && month > recurring.endMonth) continue;
    const person = personOrThrow(config, recurring.personId);
    charges.push({
      personId: recurring.personId,
      category: "RECURRING",
      label: recurring.label,
      amountCents: recurring.amountCents,
      // A recurring charge goes the way the person's utilities go, so it has no route or day of its own.
      payViaPersonId: routeFor(person, "UTILITIES"),
      dueDate: dueDateKey(month, person.dueDays.UTILITIES),
    });
  }

  return charges;
}

// Utilities charges for a saved bill: tenant shares plus the owner/primary
// remainder, stored under the given label. Hard check: the split must add up to
// the bill's current charges.
export function buildUtilitiesCharges(
  config: HouseholdConfig,
  bill: { month: string; currentChargesCents: number },
  label = "Utilities",
): EngineCharge[] {
  const amounts = utilityShareAmounts(config, bill.currentChargesCents);

  const sum = Object.values(amounts).reduce((s, v) => s + v, 0);
  if (sum !== bill.currentChargesCents) {
    throw new SplitEngineError("Utilities split does not add up to the bill's current charges");
  }

  // A 0% split leaves nothing to charge, as with a tenant at 0 shares.
  return Object.entries(amounts).filter(([, amountCents]) => amountCents !== 0).map(([personId, amountCents]) => {
    const person = personOrThrow(config, personId);
    return {
      personId,
      category: "UTILITIES",
      label,
      amountCents,
      payViaPersonId: routeFor(person, "UTILITIES"),
      dueDate: dueDateKey(bill.month, person.dueDays.UTILITIES),
    };
  });
}

/** How a shared one-off from the Add charge sheet is split. */
export type OneOffSplit =
  | { method: "EQUAL" }
  | { method: "PER_SHARE"; parts: SharePart[] }
  | { method: "CUSTOM"; parts: CustomPart[] };

/** What every Add charge charge has: its label, total and the one due date everyone in it shares. */
export interface AddChargeBasics {
  label: string;
  totalCents: number;
  /** `YYYY-MM-DD`. Null only for a preview before the date is picked; a stored charge always has one. */
  dueDate: string | null;
}

/** One charge per person with an amount, in the config's order. Someone at $0 gets no charge. */
function chargesFor(
  config: HouseholdConfig,
  amounts: Record<string, number>,
  category: "AIRCON" | "ONE_OFF",
  routeType: ChargeType,
  basics: AddChargeBasics,
): EngineCharge[] {
  const sum = Object.values(amounts).reduce((s, v) => s + v, 0);
  if (sum !== basics.totalCents) throw new SplitEngineError("The split does not add up to the total");
  return config.people
    .filter((person) => (amounts[person.personId] ?? 0) !== 0)
    .map((person) => ({
      personId: person.personId,
      category,
      label: basics.label,
      amountCents: amounts[person.personId],
      payViaPersonId: routeFor(person, routeType),
      dueDate: basics.dueDate,
    }));
}

/**
 * Aircon servicing from the Add charge sheet: always shared by aircon units, routed by each person's aircon route.
 *
 * @param config - The config pinned to the month.
 * @param basics - The label, total and due date.
 * @returns One `AIRCON` charge per person with an amount, the owner's included.
 * @throws SplitEngineError when the config has no owner.
 */
export function buildAirconCharges(config: HouseholdConfig, basics: AddChargeBasics): EngineCharge[] {
  return chargesFor(config, airconUnitAmounts(config, basics.totalCents), "AIRCON", "AIRCON", basics);
}

/**
 * A shared one-off (Other) from the Add charge sheet: split across everyone, the owner included, and routed the way
 * each person's utilities go.
 *
 * @param config - The config pinned to the month.
 * @param basics - The label, total and due date.
 * @param split - Equal, by shares (each person's, in thousandths: the household's or changed for this charge), or
 *   custom amounts that add up to the total.
 * @returns One `ONE_OFF` charge per person with an amount.
 * @throws SplitEngineError when the config has no owner, the shares are below 0 or all 0, or custom amounts don't add
 * up; or the parts name someone not in the config.
 */
export function buildSharedOneOffCharges(config: HouseholdConfig, basics: AddChargeBasics, split: OneOffSplit): EngineCharge[] {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new SplitEngineError("Config has no owner");
  let amounts: Record<string, number>;
  if (split.method === "EQUAL") {
    amounts = splitEqual(basics.totalCents, config.people.map((p) => p.personId), owner.personId);
  } else if (split.method === "PER_SHARE") {
    for (const part of split.parts) personOrThrow(config, part.personId);
    amounts = splitByWeights(basics.totalCents, split.parts, owner.personId);
  } else {
    for (const part of split.parts) personOrThrow(config, part.personId);
    amounts = splitCustom(basics.totalCents, split.parts);
  }
  return chargesFor(config, amounts, "ONE_OFF", "UTILITIES", basics);
}

/**
 * A personal one-off (Other) from the Add charge sheet: one charge for one person, routed the way their utilities go.
 *
 * @param config - The config pinned to the month.
 * @param basics - The label, total and due date.
 * @param personId - Who owes it. Never the owner.
 * @returns The charge.
 * @throws SplitEngineError when the person is not in the config or is the owner.
 */
export function buildPersonalOneOffCharge(config: HouseholdConfig, basics: AddChargeBasics, personId: string): EngineCharge {
  const person = personOrThrow(config, personId);
  if (person.role === "OWNER") throw new SplitEngineError("A personal charge is never the owner's");
  return {
    personId,
    category: "ONE_OFF",
    label: basics.label,
    amountCents: basics.totalCents,
    payViaPersonId: routeFor(person, "UTILITIES"),
    dueDate: basics.dueDate,
  };
}
