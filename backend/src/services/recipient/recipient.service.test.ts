import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildRecipient, type RecipientChargeRow } from "@/lib/recipient/build-recipient";
import { getRecipient, type RecipientDb } from "./recipient.service";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const JORDAN_RENT: RecipientChargeRow = {
  id: "jordan-rent",
  personId: PERSON_IDS.jordan,
  month: "2026-11",
  category: "RENT",
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01T00:00:00+08:00"),
  payViaPersonId: null,
  paidCents: null,
};

/** A database with November open and its bill saved, unless told otherwise. */
function fakeDb({ open = true, bill = true } = {}) {
  const queries: Record<string, unknown> = {};
  const db: RecipientDb = {
    month: {
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: { findMany: async () => PEOPLE },
    bill: { findUnique: async () => (bill ? { currentChargesCents: 41230 } : null) },
    charge: {
      findMany: async (args) => {
        queries.charge = args;
        return [JORDAN_RENT];
      },
    },
    messageEvent: {
      findMany: async (args) => {
        queries.messageEvent = args;
        return [];
      },
    },
  };
  return { db, queries };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getRecipient", () => {
  it("passes what the queries return to the builder", async () => {
    const { db } = fakeDb();
    expect(await getRecipient(db, "2026-11", PERSON_IDS.jordan)).toEqual(
      buildRecipient({
        month: "2026-11",
        today: "2026-11-01",
        config: NOV_2026_CONFIG,
        person: { id: PERSON_IDS.jordan, name: "Jordan" },
        people: PEOPLE.map((p) => ({ id: p.id, name: p.name })),
        billCents: 41230,
        charges: [JORDAN_RENT],
        messages: [],
      }),
    );
  });

  it("reads the month's charges and earlier unpaid corrections the person pays, and their message events", async () => {
    const { db, queries } = fakeDb();
    await getRecipient(db, "2026-11", PERSON_IDS.priya);

    expect(queries.charge).toMatchObject({
      where: {
        AND: [
          { OR: [{ month: "2026-11" }, { month: { lt: "2026-11" }, category: "CORRECTION", paidCents: null }] },
          { OR: [{ personId: PERSON_IDS.priya, payViaPersonId: null }, { payViaPersonId: PERSON_IDS.priya }] },
        ],
      },
    });
    expect(queries.messageEvent).toMatchObject({ where: { month: "2026-11", personId: PERSON_IDS.priya } });
  });

  it("passes a null bill before the bill is saved", async () => {
    const r = await getRecipient(fakeDb({ bill: false }).db, "2026-11", PERSON_IDS.jordan);
    expect(r.primaryAction?.enabled).toBe(false);
  });

  it("throws 404 no_month for a month that is not open", async () => {
    await expect(getRecipient(fakeDb({ open: false }).db, "2026-12", PERSON_IDS.jordan)).rejects.toMatchObject({
      status: 404,
      code: "no_month",
    });
  });

  it.each([
    ["an unknown person", "person-nobody"],
    ["the owner", PERSON_IDS.alex],
  ])("throws 404 no_person for %s", async (_, personId) => {
    await expect(getRecipient(fakeDb().db, "2026-11", personId)).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });

  it("throws 404 no_person for someone not in the month's household version", async () => {
    const { db } = fakeDb();
    db.person.findMany = async () => [...PEOPLE, { id: "person-kim", name: "Kim", isOwner: false }];
    await expect(getRecipient(db, "2026-11", "person-kim")).rejects.toMatchObject({ status: 404, code: "no_person" });
  });
});
