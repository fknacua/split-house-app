import { parseHouseholdConfig, todayKey, type RecipientResponse } from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { now } from "@/lib/now";
import { buildRecipient, type RecipientChargeRow, type RecipientMessageEvent } from "@/lib/recipient/build-recipient";

const CHARGE_SELECT = {
  id: true,
  personId: true,
  month: true,
  category: true,
  label: true,
  amountCents: true,
  dueDate: true,
  payViaPersonId: true,
  paidCents: true,
} as const;

const MESSAGE_SELECT = { kind: true, chargeId: true, openedAt: true } as const;

/** The charges a person pays: the month's and earlier months' unpaid corrections, their own or paid through them. */
interface RecipientChargesWhere {
  AND: [
    { OR: [{ month: string }, { month: { lt: string }; category: "CORRECTION"; paidCents: null }] },
    { OR: [{ personId: string; payViaPersonId: null }, { payViaPersonId: string }] },
  ];
}

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface RecipientDb {
  month: {
    findUnique(args: {
      where: { month: string };
      select: { householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  person: {
    findMany(args: {
      select: { id: true; name: true; isOwner: true };
    }): Promise<{ id: string; name: string; isOwner: boolean }[]>;
  };
  bill: {
    findUnique(args: {
      where: { month: string };
      select: { currentChargesCents: true };
    }): Promise<{ currentChargesCents: number } | null>;
  };
  charge: {
    findMany(args: { where: RecipientChargesWhere; select: typeof CHARGE_SELECT }): Promise<RecipientChargeRow[]>;
  };
  messageEvent: {
    findMany(args: {
      where: { month: string; personId: string };
      select: typeof MESSAGE_SELECT;
    }): Promise<RecipientMessageEvent[]>;
  };
}

/**
 * Reads the month with its pinned household version, the people, the bill's total, the charges the
 * person pays and their message events, and hands them to `buildRecipient`. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - The month key, e.g. `2026-11`.
 * @param personId - Who the screen is for.
 * @returns The Recipient screen.
 * @throws {ApiError} 404 `no_month` when the month is not open; 404 `no_person` for an unknown
 * person, the owner, or someone not in the month's household version.
 */
export async function getRecipient(db: RecipientDb, month: string, personId: string): Promise<RecipientResponse> {
  const [opened, people, bill, charges, messages] = await Promise.all([
    db.month.findUnique({
      where: { month },
      select: { householdVersion: { select: { schemaVersion: true, config: true } } },
    }),
    db.person.findMany({ select: { id: true, name: true, isOwner: true } }),
    db.bill.findUnique({ where: { month }, select: { currentChargesCents: true } }),
    db.charge.findMany({
      where: {
        AND: [
          { OR: [{ month }, { month: { lt: month }, category: "CORRECTION", paidCents: null }] },
          { OR: [{ personId, payViaPersonId: null }, { payViaPersonId: personId }] },
        ],
      },
      select: CHARGE_SELECT,
    }),
    db.messageEvent.findMany({ where: { month, personId }, select: MESSAGE_SELECT }),
  ]);
  if (!opened) throw new ApiError(404, "no_month", "This month isn’t open.");

  const config = parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config);
  const person = people.find((p) => p.id === personId);
  const inMonth = config.people.some((p) => p.personId === personId && p.role !== "OWNER");
  if (!person || person.isOwner || !inMonth) {
    throw new ApiError(404, "no_person", "That person isn’t in this month’s household.");
  }

  return buildRecipient({
    month,
    today: todayKey(now()),
    config,
    person: { id: person.id, name: person.name },
    people: people.map((p) => ({ id: p.id, name: p.name })),
    billCents: bill?.currentChargesCents ?? null,
    charges,
    messages,
  });
}
