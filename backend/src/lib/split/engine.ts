import type { ChargeType, HouseholdConfig, PersonConfig } from "@splithouse/shared";

// Pure split engine (see docs/SplitHouse — Data Model.md "Split engine" and
// "Rounding rule"). No Prisma, no Date.now: every input is passed in.
// Rounding rule: everyone except Francis (the owner) is rounded to the nearest
// cent, half up. Francis's amount is always a remainder, so a category's parts
// add up exactly to its total.

export class SplitEngineError extends Error {}

export interface EngineCharge {
  personId: string;
  category: Exclude<ChargeType, "RECURRING"> | "RECURRING";
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

function dueDateFor(month: string, dueDay: number | undefined): string | null {
  if (!dueDay) return null;
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const day = Math.min(dueDay, daysInMonth);
  return `${month}-${String(day).padStart(2, "0")}`;
}

function personOrThrow(config: HouseholdConfig, personId: string): PersonConfig {
  const person = config.people.find((p) => p.personId === personId);
  if (!person) throw new SplitEngineError(`Unknown person ${personId}`);
  return person;
}

// Rent (fixed tenant rent plus the shared room split) and recurring charges
// for a month, from the household config alone.
export function buildMonthCharges(config: HouseholdConfig, month: string): EngineCharge[] {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new SplitEngineError("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;

  const charges: EngineCharge[] = [];

  for (const person of config.people) {
    if (person.role === "TENANT" && person.rentCents > 0) {
      charges.push({
        personId: person.personId,
        category: "RENT",
        label: "Rent",
        amountCents: person.rentCents,
        payViaPersonId: routeFor(person, "RENT"),
        dueDate: dueDateFor(month, person.dueDays.RENT),
      });
    }
  }

  const sharedRent = splitRemainderByBps(
    config.categories.rent.sharedRentCents,
    owner.personId,
    primary?.personId ?? null,
    config.categories.rent.primaryBps,
  );
  for (const [personId, amountCents] of Object.entries(sharedRent)) {
    const person = personOrThrow(config, personId);
    charges.push({
      personId,
      category: "RENT",
      label: "Rent",
      amountCents,
      payViaPersonId: routeFor(person, "RENT"),
      dueDate: dueDateFor(month, person.dueDays.RENT),
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
      payViaPersonId: routeFor(person, "RECURRING"),
      dueDate: dueDateFor(month, person.dueDays.RECURRING),
    });
  }

  return charges;
}

// Utilities charges for a saved bill: tenant shares plus the owner/primary
// remainder. Hard check: the split must add up to the bill's current charges.
export function buildUtilitiesCharges(
  config: HouseholdConfig,
  bill: { month: string; currentChargesCents: number },
): EngineCharge[] {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new SplitEngineError("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;

  const tenants = config.people.filter((p) => p.role === "TENANT" && p.utilityShares > 0);
  const amounts = splitShareCategory(
    bill.currentChargesCents,
    config.categories.utilities.totalShares,
    tenants.map((p) => ({ personId: p.personId, units: p.utilityShares })),
    {
      ownerPersonId: owner.personId,
      primaryPersonId: primary?.personId ?? null,
      primaryBps: config.categories.utilities.primaryBps,
    },
  );

  const sum = Object.values(amounts).reduce((s, v) => s + v, 0);
  if (sum !== bill.currentChargesCents) {
    throw new SplitEngineError("Utilities split does not add up to the bill's current charges");
  }

  const label = config.templates.lineLabels.UTILITIES ?? "Utilities";
  return Object.entries(amounts).map(([personId, amountCents]) => {
    const person = personOrThrow(config, personId);
    return {
      personId,
      category: "UTILITIES",
      label,
      amountCents,
      payViaPersonId: routeFor(person, "UTILITIES"),
      dueDate: dueDateFor(bill.month, person.dueDays.UTILITIES),
    };
  });
}
