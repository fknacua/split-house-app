import {
  formatCents,
  formatDayOrdinal,
  formatMonthShortLabel,
  type ChargeType,
  type HouseholdAction,
  type HouseholdConfig,
  type HouseholdFact,
  type HouseholdMonthOption,
  type HouseholdPerson,
  type HouseholdSplit,
  type HouseholdViewResponse,
  type PersonConfig,
} from "@splithouse/shared";
import { HOME_BADGES } from "@/lib/home/badges";
import { splitRemainderByBps } from "@/lib/split/engine";
import { joinWords, personSubLine } from "./sub-line";

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
  /** Everyone, for names and numbers. `whatsappE164` is null without a number. */
  people: { id: string; name: string; whatsappE164: string | null }[];
}

const SHARE_SCALE = 1000;
const EDIT_SPLIT: HouseholdAction = { label: "Edit split", target: { kind: "edit-split" } };

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

/** A Singapore number with its usual space; any other number as stored. */
function phoneText(e164: string | null): string {
  if (!e164) return "Not set";
  const singapore = /^\+65(\d{4})(\d{4})$/.exec(e164);
  return singapore ? `+65 ${singapore[1]} ${singapore[2]}` : e164;
}

/** The facts after rent, utilities and aircon on a tenant's card: Messages, Deposit, or WhatsApp when neither applies. */
function tenantExtraFacts(
  person: PersonConfig,
  names: Map<string, string>,
  whatsappE164: string | null,
): HouseholdFact[] {
  const vias = [...new Set(Object.values(person.routes).flatMap((r) => (r?.kind === "VIA" ? [r.viaPersonId] : [])))];
  const facts: HouseholdFact[] = [];
  if (vias.length > 0) {
    const whose = vias.map((id) => `${names.get(id) ?? "Someone"}’s`);
    facts.push({ label: "Messages", value: `In ${joinWords(whose)}` });
  }
  if (person.depositCents > 0) facts.push({ label: "Deposit", value: `${formatCents(person.depositCents)} held` });
  if (facts.length === 0) facts.push({ label: "WhatsApp", value: phoneText(whatsappE164) });
  return facts;
}

/** Adds how a charge reaches the user: `1 share via Priya`. */
function withVia(text: string, person: PersonConfig, type: ChargeType, names: Map<string, string>): string {
  const via = viaId(person, type);
  return via ? `${text} via ${names.get(via) ?? "someone"}` : text;
}

/** The facts on a primary tenant's or tenant's card. */
function personFacts(
  input: HouseholdViewInput,
  person: PersonConfig,
  remainders: Remainders,
  names: Map<string, string>,
): HouseholdFact[] {
  const whatsapp = input.people.find((p) => p.id === person.personId)?.whatsappE164 ?? null;
  const isPrimary = person.role === "PRIMARY";
  const rentCents = isPrimary ? remainders.rent.primary : person.rentCents;
  const shares = isPrimary ? remainders.shares.primary : person.utilityShares;
  const units = isPrimary ? remainders.units.primary : person.airconUnits * SHARE_SCALE;

  // A tenant's rent says it is paid directly, against their other routes; the primary's has no such contrast.
  const rentDirect = isPrimary ? formatCents(rentCents) : `${formatCents(rentCents)} direct`;
  const rentVia = viaId(person, "RENT");
  const rent = rentVia ? withVia(formatCents(rentCents), person, "RENT", names) : rentDirect;

  const { config } = input;
  return [
    { label: dueLabel(config, person, "RENT", "Rent"), value: rent },
    {
      label: dueLabel(config, person, "UTILITIES", "Utilities"),
      value: withVia(countText(shares, "share"), person, "UTILITIES", names),
    },
    { label: "Aircon", value: countText(units, "unit") },
    ...(isPrimary
      ? [{ label: "WhatsApp", value: phoneText(whatsapp) }]
      : tenantExtraFacts(person, names, whatsapp)),
  ];
}

/** Everyone's cards as drawn: the primary tenant, the tenants in config order, then the owner as `You`. */
function personCards(input: HouseholdViewInput, remainders: Remainders, names: Map<string, string>): HouseholdPerson[] {
  const { config } = input;
  const { owner, primary } = remainders;
  const tenants = config.people.filter((p) => p.role === "TENANT");

  const card = (person: PersonConfig, actions: HouseholdAction[]): HouseholdPerson => {
    const name = names.get(person.personId) ?? "Someone";
    return {
      personId: person.personId,
      initial: (Array.from(name.trim())[0] ?? "?").toUpperCase(),
      name,
      sub: personSubLine(config, person.personId, names),
      facts: personFacts(input, person, remainders, names),
      actions,
    };
  };
  const edit = (person: PersonConfig): HouseholdAction => ({
    label: "Edit",
    target: { kind: "edit-person", personId: person.personId },
  });

  return [
    ...(primary ? [card(primary, [EDIT_SPLIT, edit(primary)])] : []),
    ...tenants.map((tenant) => card(tenant, [edit(tenant)])),
    {
      personId: owner.personId,
      initial: "Y",
      name: "You",
      sub: personSubLine(config, owner.personId, names),
      facts: [
        { label: "Rent share", value: formatCents(remainders.rent.owner) },
        { label: "Utilities", value: countText(remainders.shares.owner, "share") },
        { label: "Aircon", value: countText(remainders.units.owner, "unit") },
        { label: "Leftover cents", value: "Absorbed by you" },
      ],
      actions: primary ? [EDIT_SPLIT] : [],
    },
  ];
}

/** `$1,675.00 each` when both pay the same, otherwise each one's part. */
function eachText(owner: number, primary: number, primaryName: string, format: (value: number) => string): string {
  return owner === primary ? `${format(owner)} each` : `you ${format(owner)}, ${primaryName} ${format(primary)}`;
}

/** The "Your split" section, or null with no primary tenant to split with. */
function splitSection(
  config: HouseholdConfig,
  remainders: Remainders,
  names: Map<string, string>,
): HouseholdSplit | null {
  const { primary, rent, shares, units } = remainders;
  if (!primary) return null;

  const primaryName = names.get(primary.personId) ?? "Someone";
  const tenantNames = config.people
    .filter((p) => p.role === "TENANT")
    .map((p) => names.get(p.personId) ?? "Someone");
  const { categories } = config;
  const row = (label: string, ownerBps: number, primaryBps: number, detail: string) => ({
    label,
    detail,
    ownerPercent: ownerBps / 100,
    ratio: `${ownerBps / 100} / ${primaryBps / 100}`,
  });

  return {
    title: `Your split with ${primaryName}`,
    sub: tenantNames.length > 0 ? `What’s left after ${joinWords(tenantNames, "&")}` : null,
    edit: EDIT_SPLIT,
    rows: [
      row(
        "Rent",
        categories.rent.ownerBps,
        categories.rent.primaryBps,
        `${formatCents(categories.rent.sharedRentCents)} master room · ${eachText(rent.owner, rent.primary, primaryName, formatCents)}`,
      ),
      row(
        "Utilities",
        categories.utilities.ownerBps,
        categories.utilities.primaryBps,
        `${amountText(shares.total)} of ${amountText(categories.utilities.totalShares)} shares · ${eachText(shares.owner, shares.primary, primaryName, amountText)}`,
      ),
      row(
        "Aircon",
        categories.aircon.ownerBps,
        categories.aircon.primaryBps,
        `${amountText(units.total)} of ${categories.aircon.totalUnits} units · ${eachText(units.owner, units.primary, primaryName, amountText)}`,
      ),
    ],
  };
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
  const names = new Map(input.people.map((p) => [p.id, p.name]));
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
    people: personCards(input, remainders, names),
    split: splitSection(config, remainders, names),
    addPerson: { label: "Add subtenant", target: { kind: "add-person" } },
  };
}
