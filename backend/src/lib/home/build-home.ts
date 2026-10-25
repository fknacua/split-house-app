import {
  dateKeyOf,
  daysUntil,
  dueDateKey,
  formatCents,
  formatDateShort,
  formatMonthLabel,
  type BadgeContent,
  type HomeAction,
  type HomeHero,
  type HomePrimaryAction,
  type HomeResponse,
  type HomeRow,
  type HomeStatus,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { HOME_BADGES } from "./badges";

/** A person, as much of them as Home needs. */
export interface HomePerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** A charge, as much of it as Home needs. */
export interface HomeChargeRow {
  id: string;
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  paidCents: number | null;
}

/** Everything `buildHome` works from. */
export interface HomeInput {
  month: string;
  /** Date key of today in Singapore. */
  today: string;
  status: HomeStatus;
  /** The config pinned to the month. */
  config: HouseholdConfig;
  people: HomePerson[];
  charges: HomeChargeRow[];
}

// Rows due on the same day go: rent, recurring, utilities, then the bill.
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { RENT: 0, RECURRING: 1, UTILITIES: 2 };
const BILL_RANK = 3;

interface RankedRow {
  row: HomeRow;
  rank: number;
}

function chargeBadge(charge: HomeChargeRow, dueDate: string | null, today: string): BadgeContent {
  if (charge.paidCents !== null) 
    return HOME_BADGES.paid;
  if (dueDate !== null && daysUntil(dueDate, today) === 0) 
    return HOME_BADGES.dueToday;

  return HOME_BADGES.upcoming;
}

/** The detail line: only a route via someone else is worth saying, paying direct is the default. */
function routeDetail(viaPersonId: string | null | undefined, names: Map<string, string>): string | null {
  return viaPersonId ? `Pays via ${names.get(viaPersonId)}` : null;
}

/** One row per real charge. */
function chargeRow(input: HomeInput, charge: HomeChargeRow, names: Map<string, string>): RankedRow {
  const dueDate = charge.dueDate ? dateKeyOf(charge.dueDate) : null;
  const badge = chargeBadge(charge, dueDate, input.today);
  const unpaid = charge.paidCents === null;
  const needsAttention = unpaid && badge === HOME_BADGES.dueToday;
  const markPaid: HomeAction = {
    label: "Mark paid",
    tone: "outline",
    icon: "check",
    target: { kind: "mark-paid", chargeId: charge.id },
  };
  return {
    rank: CATEGORY_RANK[charge.category] ?? 0,
    row: {
      id: charge.id,
      dueDate,
      title: `${charge.label} · ${names.get(charge.personId)}`,
      amount: formatCents(charge.amountCents),
      detail: routeDetail(charge.payViaPersonId, names),
      badge,
      tint: needsAttention ? "info" : "none",
      expanded: needsAttention,
      note: null,
      actions: unpaid ? [markPaid] : [],
      link: {
        label: "View details",
        target: {
          kind: "recipient",
          month: input.month,
          personId: charge.payViaPersonId ?? charge.personId,
        },
      },
    },
  };
}

/**
 * Utilities rows for charges that do not exist until a bill is saved, taken from the pinned
 * config. A person paid via someone with no due day of their own uses that person's due day.
 */
function projectedUtilitiesRows(input: HomeInput, names: Map<string, string>): RankedRow[] {
  const { config, month } = input;
  return config.people
    .filter((p) =>
      p.role === "TENANT"
        ? p.utilityShares > 0
        : p.role === "PRIMARY" && config.categories.utilities.primaryBps > 0,
    )
    .map((p) => {
      const route = p.routes.UTILITIES;
      const via =
        route?.kind === "VIA" ? config.people.find((q) => q.personId === route.viaPersonId) : undefined;
      return {
        rank: CATEGORY_RANK.UTILITIES!,
        row: {
          id: `utilities-${p.personId}`,
          dueDate: dueDateKey(month, p.dueDays.UTILITIES ?? via?.dueDays.UTILITIES),
          title: `Utilities · ${names.get(p.personId)}`,
          amount: "—",
          detail: routeDetail(via?.personId, names),
          badge: HOME_BADGES.needsBill,
          tint: "none",
          expanded: false,
          note: "Worked out once the utilities bill is uploaded.",
          actions: [],
          link: {
            label: "View details",
            target: { kind: "recipient", month, personId: via?.personId ?? p.personId },
          },
        },
      } satisfies RankedRow;
    });
}

function billRow(input: HomeInput): RankedRow {
  return {
    rank: BILL_RANK,
    row: {
      id: "bill",
      dueDate: dueDateKey(input.month, input.config.categories.utilities.billDueDay),
      title: "Utilities bill",
      amount: "—",
      detail: "You pay utilities",
      badge: HOME_BADGES.billNotUploaded,
      tint: "none",
      expanded: false,
      note: null,
      actions: [],
      link: { label: "Upload bill", target: { kind: "bill-upload", month: input.month } },
    },
  };
}

/** Non-owner charges other than utilities, minus what has been paid. Never below zero. */
function frontingCents(charges: HomeChargeRow[], ownerIds: Set<string>): number {
  const others = charges.filter((c) => !ownerIds.has(c.personId) && c.category !== "UTILITIES");
  const owed = others.reduce((sum, c) => sum + c.amountCents, 0);
  const paid = others.reduce((sum, c) => sum + (c.paidCents ?? 0), 0);
  return Math.max(0, owed - paid);
}

function buildHero(input: HomeInput, fronting: number): HomeHero {
  switch (input.status) {
    case "bill_missing":
      return {
        dateLine: `${formatDateShort(input.today)} · Step 1 of 3`,
        steps: [
          { label: "Upload bill", state: "current" },
          { label: "Send messages", state: "todo" },
          { label: "Settle up", state: "todo" },
        ],
        compactStatus: "Waiting on the utilities bill",
        body: {
          kind: "waiting",
          title: "Waiting on the utilities bill",
          text: "It usually lands around the 2nd. Upload it and everyone’s utilities share is worked out.",
          tiles: [
            { label: "You’re fronting", value: formatCents(fronting) },
            { label: "Utilities bill coverage", value: "No bill yet" },
          ],
        },
      };
  }
}

function buildPrimaryAction(input: HomeInput): HomePrimaryAction {
  switch (input.status) {
    case "bill_missing":
      return {
        label: "Upload utilities bill",
        icon: "upload",
        target: { kind: "bill-upload", month: input.month },
      };
  }
}

/**
 * Builds the Home response: the hero, one row per charge ordered by due date, and the footer.
 * Rows for utilities charges that do not exist yet are projected from the pinned config.
 *
 * @param input - The month, today's date key, its status, the pinned config and what was read.
 * @returns The response, ready to render.
 */
export function buildHome(input: HomeInput): HomeResponse {
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const ownerIds = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));

  // The owner's own charges are not payments to anyone, so they get no row.
  const ranked: RankedRow[] = [
    ...input.charges.filter((c) => !ownerIds.has(c.personId)).map((c) => chargeRow(input, c, names)),
    ...(input.status === "bill_missing" ? projectedUtilitiesRows(input, names) : []),
    billRow(input),
  ];
  ranked.sort(
    (a, b) =>
      (a.row.dueDate ?? "9999-12-31").localeCompare(b.row.dueDate ?? "9999-12-31") ||
      a.rank - b.rank ||
      a.row.title.localeCompare(b.row.title),
  );

  return {
    month: input.month,
    monthName: formatMonthLabel(input.month),
    status: input.status,
    hero: buildHero(input, frontingCents(input.charges, ownerIds)),
    rows: ranked.map((r) => r.row),
    primaryAction: buildPrimaryAction(input),
  };
}
