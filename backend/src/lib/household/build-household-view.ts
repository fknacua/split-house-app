import {
  formatCents,
  formatDayOrdinal,
  formatMonthShortLabel,
  type ChargeType,
  type HouseholdConfig,
  type HouseholdFact,
  type HouseholdMonthOption,
  type HouseholdPerson,
  type HouseholdSplitRow,
  type HouseholdViewResponse,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { HOME_BADGES } from "@/lib/home/badges";
import { splitRemainderByBps } from "@/lib/split/engine";
import { personSubLine } from "./sub-line";

/** What `buildHouseholdView` reads. */
export interface HouseholdViewInput {
  /** The month to show, `YYYY-MM`. */
  month: string;
  /** The active month: the newest opened, or the calendar month when later. */
  activeMonth: string;
  /** Every household version's starts-from month. */
  versionMonths: string[];
  /** The config in effect for `month`. */
  config: HouseholdConfig;
  /** Everyone, for names and colors. */
  people: { id: string; name: string; color: PersonColor }[];
}

const SHARE_SCALE = 1000;
const FALLBACK_COLOR: PersonColor = "SLATE";

/** The names and colors from the `Person` rows. */
interface PersonLookup {
  names: Map<string, string>;
  colors: Map<string, PersonColor>;
}

/** Who splits the remainder of each category, and each one's part of it. */
interface Remainders {
  owner: PersonConfig;
  primary: PersonConfig | null;
  rent: { owner: number; primary: number };
  /** In thousandths of a share. */
  shares: { total: number; owner: number; primary: number };
  /** In thousandths of a unit, since a split can leave part of a unit. */
  units: { total: number; owner: number; primary: number };
}

/** A count in thousandths, as a plain number: `1.5`, `2`. */
function amountText(thousandths: number): string {
  return String(Number((thousandths / SHARE_SCALE).toFixed(3)));
}

/** A count in thousandths with its word: `1 share`, `1.5 shares`. */
function countText(thousandths: number, word: string): string {
  return `${amountText(thousandths)} ${thousandths === SHARE_SCALE ? word : `${word}s`}`;
}

/** Splits rent, utility shares and aircon units between the owner and the primary tenant, by the engine's rule. */
function remaindersOf(config: HouseholdConfig): Remainders {
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new Error("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;
  const { rent, utilities, aircon } = config.categories;

  const split = (total: number, primaryBps: number) => {
    const parts = splitRemainderByBps(total, owner.personId, primary?.personId ?? null, primaryBps);
    return { total, owner: parts[owner.personId], primary: primary ? parts[primary.personId] : 0 };
  };
  const tenantShares = config.people.reduce((sum, p) => sum + p.utilityShares, 0);
  const tenantUnits = config.people.reduce((sum, p) => sum + p.airconUnits, 0);

  return {
    owner,
    primary,
    rent: split(rent.sharedRentCents, rent.primaryBps),
    shares: split(utilities.totalShares - tenantShares, utilities.primaryBps),
    units: split((aircon.totalUnits - tenantUnits) * SHARE_SCALE, aircon.primaryBps),
  };
}

/** The "Showing:" list: each version's starts-from month and the active month, newest first. */
function monthOptions(input: HouseholdViewInput): HouseholdMonthOption[] {
  const months = [...new Set([...input.versionMonths, input.activeMonth])].sort().reverse();
  return months.map((month) => ({
    month,
    label: formatMonthShortLabel(month),
    badge: month > input.activeMonth ? HOME_BADGES.upcoming : null,
  }));
}

/** The person this charge type goes via, or null when it is paid directly. */
function viaId(person: PersonConfig, type: ChargeType): string | null {
  const route = person.routes[type];
  return route?.kind === "VIA" ? route.viaPersonId : null;
}

/** A fact label with the due day when one is set. Via someone, the day is that person's. */
function dueLabel(config: HouseholdConfig, person: PersonConfig, type: ChargeType, label: string): string {
  const via = viaId(person, type);
  const payer = via ? config.people.find((p) => p.personId === via) : person;
  const day = payer?.dueDays[type];
  return day ? `${label} · due ${formatDayOrdinal(day)}` : label;
}

/** The facts on a primary tenant's or tenant's card: rent and utilities. The sub line says how they pay. */
function personFacts(config: HouseholdConfig, person: PersonConfig, remainders: Remainders): HouseholdFact[] {
  const isPrimary = person.role === "PRIMARY";
  const rentCents = isPrimary ? remainders.rent.primary : person.rentCents;
  const shares = isPrimary ? remainders.shares.primary : person.utilityShares;

  return [
    { label: dueLabel(config, person, "RENT", "Rent"), value: formatCents(rentCents) },
    { label: dueLabel(config, person, "UTILITIES", "Utilities"), value: countText(shares, "share") },
  ];
}

/** Everyone's cards as drawn: the primary tenant, the tenants in config order, then the owner as `You`. */
function personCards(input: HouseholdViewInput, remainders: Remainders, { names, colors }: PersonLookup): HouseholdPerson[] {
  const { config } = input;
  const { owner, primary } = remainders;
  const tenants = config.people.filter((p) => p.role === "TENANT");

  const card = (person: PersonConfig): HouseholdPerson => {
    const name = names.get(person.personId) ?? "Someone";
    return {
      personId: person.personId,
      initial: (Array.from(name.trim())[0] ?? "?").toUpperCase(),
      name,
      color: colors.get(person.personId) ?? FALLBACK_COLOR,
      sub: personSubLine(config, person.personId, names),
      facts: personFacts(config, person, remainders),
      actions: [
        { label: "View", target: { kind: "view-person", personId: person.personId } },
        { label: "Edit", target: { kind: "edit-person", personId: person.personId } },
      ],
    };
  };

  return [
    ...(primary ? [card(primary)] : []),
    ...tenants.map(card),
    {
      personId: owner.personId,
      initial: "Y",
      name: "You",
      color: colors.get(owner.personId) ?? FALLBACK_COLOR,
      sub: personSubLine(config, owner.personId, names),
      facts: [
        { label: "Rent share", value: formatCents(remainders.rent.owner) },
        { label: "Utilities", value: countText(remainders.shares.owner, "share") },
      ],
      actions: [],
    },
  ];
}

/** "Household split": rent, utilities and aircon across everyone, the owner first, then the primary tenant, then the tenants. */
function splitRows(config: HouseholdConfig, remainders: Remainders, { names, colors }: PersonLookup): HouseholdSplitRow[] {
  const { owner, primary, rent, shares, units } = remainders;
  const tenants = config.people.filter((p) => p.role === "TENANT");

  const row = (
    label: string,
    split: { owner: number; primary: number },
    tenantAmount: (tenant: PersonConfig) => number,
    format: (amount: number) => string,
    detail: (total: number) => string,
  ): HouseholdSplitRow => {
    const parts = [
      { person: owner, name: "You", amount: split.owner },
      ...(primary ? [{ person: primary, name: names.get(primary.personId) ?? "Someone", amount: split.primary }] : []),
      ...tenants.map((tenant) => ({
        person: tenant,
        name: names.get(tenant.personId) ?? "Someone",
        amount: tenantAmount(tenant),
      })),
    ];
    const total = parts.reduce((sum, part) => sum + part.amount, 0);
    const segments = parts.map(({ person, name, amount }) => ({
      personId: person.personId,
      name,
      value: format(amount),
      percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      color: colors.get(person.personId) ?? FALLBACK_COLOR,
    }));
    return {
      label,
      detail: detail(total),
      segments,
      accessibilityLabel: `${label}: ${segments.map((s) => `${s.name} ${s.value}`).join(", ")}`,
    };
  };

  return [
    row("Rent", rent, (t) => t.rentCents, formatCents, (total) => `${formatCents(total)} across the home`),
    row("Utilities", shares, (t) => t.utilityShares, amountText, (total) => countText(total, "share")),
    row("Aircon", units, (t) => t.airconUnits * SHARE_SCALE, amountText, (total) => countText(total, "unit")),
  ];
}

/**
 * The Household screen for one month, display-ready. Reads the config only: no bill exists for a
 * future month, so utilities and aircon show as shares and units, never as money. The landlord's
 * rent and rooms are not in the config yet (9.9), so the card has only the two stats it can show.
 *
 * @param input - The month, the config in effect for it, the people and the version months.
 * @returns The response for `GET /api/household`.
 */
export function buildHouseholdView(input: HouseholdViewInput): HouseholdViewResponse {
  const { config } = input;
  const lookup: PersonLookup = {
    names: new Map(input.people.map((p) => [p.id, p.name])),
    colors: new Map(input.people.map((p) => [p.id, p.color])),
  };
  const remainders = remaindersOf(config);
  const { aircon, utilities } = config.categories;

  return {
    month: input.month,
    monthLabel: formatMonthShortLabel(input.month),
    monthOptions: monthOptions(input),
    landlord: {
      stats: [
        { value: String(aircon.totalUnits), label: aircon.totalUnits === 1 ? "aircon unit" : "aircon units" },
        {
          value: amountText(utilities.totalShares),
          label: utilities.totalShares === SHARE_SCALE ? "utility share" : "utility shares",
        },
      ],
      edit: { label: "Edit", target: { kind: "edit-home" } },
    },
    splitRows: splitRows(config, remainders, lookup),
    people: personCards(input, remainders, lookup),
    addPerson: { label: "Add subtenant", target: { kind: "add-person" } },
  };
}
