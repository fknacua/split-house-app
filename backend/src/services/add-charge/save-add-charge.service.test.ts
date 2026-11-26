import { HOUSEHOLD_SCHEMA_VERSION, type AddChargeRequest } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { correctableRows } from "@/lib/fixtures/correctable-charges";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import { saveAddCharge, type SaveAddChargeDb, type SaveAddChargeTx } from "./save-add-charge.service";

const { alex, priya, sam, jordan } = PERSON_IDS;

type ChargeRow = Parameters<SaveAddChargeTx["charge"]["createManyAndReturn"]>[0]["data"][number] & { id: string };
type CorrectionRow = Parameters<SaveAddChargeTx["charge"]["create"]>[0]["data"] & { id: string };

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-24T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

/** An in-memory database with November open. A failed transaction keeps nothing, as Postgres would. */
function fakeDb(opts: { open?: boolean; fyi?: boolean; keys?: { key: string; endpoint: string; response: unknown }[] } = {}) {
  const events = fakeEventTables({ fyi: opts.fyi });
  const state = {
    charges: [] as ChargeRow[],
    corrections: [] as CorrectionRow[],
    groups: [] as { id: string; scope: string; splitMethod: string; totalCents: number }[],
    keys: [...(opts.keys ?? [])],
  };
  let next = 0;
  const tx: SaveAddChargeTx = {
    ...events.tables,
    // November is settled before the save: its bill is paid and nothing is owed.
    bill: { findMany: async () => [{ month: "2026-11", paidCents: 41230 }] },
    idempotentRequest: {
      findUnique: async ({ where }) => state.keys.find((k) => k.key === where.key) ?? null,
      create: async ({ data }) => {
        if (state.keys.some((k) => k.key === data.key)) throw Object.assign(new Error("unique"), { code: "P2002" });
        state.keys.push(data);
        return data;
      },
    },
    month: {
      findFirst: async () =>
        opts.open === false
          ? null
          : {
              month: "2026-11",
              householdVersionId: "version-nov",
              householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
            },
    },
    person: {
      findMany: async () => [
        { id: alex, name: "Alex", color: "BLUE" },
        { id: priya, name: "Priya", color: "ORANGE" },
        { id: sam, name: "Sam", color: "GREEN" },
        { id: jordan, name: "Jordan", color: "PURPLE" },
      ],
    },
    messageTemplates: { findUnique: async () => null },
    chargeGroup: {
      create: async ({ data }) => {
        const group = { id: `group-${++next}`, ...data };
        state.groups.push(group);
        return { id: group.id };
      },
    },
    charge: {
      count: async () => state.charges.filter((c) => c.personId !== alex).length + state.corrections.filter((c) => c.paidCents === null).length,
      findMany: async ({ where }) => ("id" in where ? correctableRows().filter((c) => c.id === where.id) : correctableRows()),
      create: async ({ data }) => {
        const row = { ...data, id: `charge-${++next}` };
        state.corrections.push(row);
        return { id: row.id };
      },
      createManyAndReturn: async ({ data }) => {
        const rows = data.map((d) => ({ ...d, id: `charge-${++next}` }));
        state.charges.push(...rows);
        return rows.map((r) => ({ id: r.id }));
      },
    },
  };
  const db: SaveAddChargeDb = {
    idempotentRequest: tx.idempotentRequest,
    $transaction: async (fn) => {
      const before = { charges: [...state.charges], corrections: [...state.corrections], groups: [...state.groups], keys: [...state.keys] };
      try {
        return await fn(tx);
      } catch (err) {
        Object.assign(state, before);
        throw err;
      }
    },
  };
  return { db, state, events: events.stored };
}

const NO_CORRECTION: AddChargeRequest["correction"] = { personId: null, month: null, chargeId: null, amountCents: null, dueDate: "2026-11-24" };

const BASE: AddChargeRequest = {
  idempotencyKey: "key-00000001",
  mode: "CHARGE",
  correction: NO_CORRECTION,
  kind: "ONE_OFF",
  label: "Fridge repair",
  amountCents: 12000,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  shares: [],
  dueDate: "2026-12-05",
};

describe("saveAddCharge", () => {
  it("records no settled FYI: a new charge only unsettles the month", async () => {
    const { db, events } = fakeDb({ fyi: true });
    await saveAddCharge(db, BASE);
    expect(events).toEqual([]);
  });

  it("saves a shared Other as a group and one charge per person, the owner included, in the newest month", async () => {
    const { db, state } = fakeDb();
    const response = await saveAddCharge(db, BASE);
    expect(state.groups).toEqual([{ id: response.chargeGroupId, scope: "SHARED", splitMethod: "EQUAL", totalCents: 12000 }]);
    expect(response).toEqual({ month: "2026-11", chargeGroupId: "group-1", chargeIds: state.charges.map((c) => c.id) });
    expect(state.charges.map((c) => [c.personId, c.amountCents, c.payViaPersonId])).toEqual([
      [alex, 3000, null],
      [priya, 3000, null],
      [sam, 3000, priya],
      [jordan, 3000, null],
    ]);
    expect(
      state.charges.every(
        (c) =>
          c.month === "2026-11" &&
          c.category === "ONE_OFF" &&
          c.label === "Fridge repair" &&
          c.householdVersionId === "version-nov" &&
          c.chargeGroupId === "group-1" &&
          c.dueDate.toISOString().startsWith("2026-12-05"),
      ),
    ).toBe(true);
  });

  it("saves aircon as a PER_UNIT group under the templates' aircon line label", async () => {
    const { db, state } = fakeDb();
    await saveAddCharge(db, { ...BASE, kind: "AIRCON", label: "", amountCents: 11000 });
    expect(state.groups[0]).toMatchObject({ splitMethod: "PER_UNIT", totalCents: 11000 });
    expect(state.charges.map((c) => [c.category, c.label, c.amountCents])).toEqual([
      ["AIRCON", "Aircon servicing", 3667],
      ["AIRCON", "Aircon servicing", 3667],
      ["AIRCON", "Aircon servicing", 1833],
      ["AIRCON", "Aircon servicing", 1833],
    ]);
  });

  it("saves Personal as one routed charge with no group", async () => {
    const { db, state } = fakeDb();
    const response = await saveAddCharge(db, { ...BASE, label: "Replacement key", amountCents: 820, scope: "PERSONAL", personId: sam });
    expect(response.chargeGroupId).toBeNull();
    expect(state.groups).toEqual([]);
    expect(state.charges).toMatchObject([{ personId: sam, amountCents: 820, payViaPersonId: priya, chargeGroupId: null }]);
  });

  it("saves Custom amounts as typed, leaving out anyone at $0", async () => {
    const { db, state } = fakeDb();
    const customAmounts = [
      { personId: alex, amountCents: 7000 },
      { personId: jordan, amountCents: 5000 },
      { personId: sam, amountCents: null },
    ];
    await saveAddCharge(db, { ...BASE, split: "CUSTOM", customAmounts });
    expect(state.groups[0].splitMethod).toBe("CUSTOM");
    expect(state.charges.map((c) => [c.personId, c.amountCents])).toEqual([
      [alex, 7000],
      [jordan, 5000],
    ]);
  });

  it("answers a repeated key with the first response and saves nothing more", async () => {
    const { db, state } = fakeDb();
    const first = await saveAddCharge(db, BASE);
    const again = await saveAddCharge(db, { ...BASE, amountCents: 99999 });
    expect(again).toEqual(first);
    expect(state.charges).toHaveLength(4);
    expect(state.keys).toEqual([{ key: BASE.idempotencyKey, endpoint: "POST /api/add-charge", response: first }]);
  });

  it("answers with the winner's response when two saves with one key race", async () => {
    const { db, state } = fakeDb();
    const winner = { month: "2026-11", chargeGroupId: "group-9", chargeIds: ["charge-9"] };
    // Both saves found no key; the other one committed first, so this one's insert hits the unique key.
    let looks = 0;
    db.idempotentRequest = { findUnique: async () => (++looks === 1 ? null : { endpoint: "POST /api/add-charge", response: winner }) };
    const run = db.$transaction;
    db.$transaction = (fn) =>
      run((tx) =>
        fn({
          ...tx,
          idempotentRequest: {
            findUnique: async () => null,
            create: async () => {
              throw Object.assign(new Error("unique"), { code: "P2002" });
            },
          },
        }),
      );
    expect(await saveAddCharge(db, BASE)).toEqual(winner);
    expect(state.charges).toEqual([]);
  });

  it("answers 409 key_reused for a key another endpoint stored", async () => {
    const { db } = fakeDb({ keys: [{ key: BASE.idempotencyKey, endpoint: "POST /api/corrections", response: {} }] });
    await expect(saveAddCharge(db, BASE)).rejects.toMatchObject({ status: 409, code: "key_reused" });
  });

  it("answers 404 no_month while no month has opened, storing nothing", async () => {
    const { db, state } = fakeDb({ open: false });
    await expect(saveAddCharge(db, BASE)).rejects.toMatchObject({ status: 404, code: "no_month" });
    expect(state.keys).toEqual([]);
  });

  it.each([
    ["no label", { label: "" }, 422, "no_label"],
    ["$0", { amountCents: 0 }, 422, "no_amount"],
    ["no due date", { dueDate: null }, 422, "no_date"],
    ["Custom amounts that don't add up", { split: "CUSTOM", customAmounts: [{ personId: alex, amountCents: 100 }] }, 422, "split_mismatch"],
    ["nothing picked", { kind: null }, 422, "no_kind"],
    ["nobody picked for Personal", { scope: "PERSONAL", personId: null }, 422, "no_who"],
    ["the owner for Personal", { scope: "PERSONAL", personId: alex }, 404, "no_person"],
  ] as [string, Partial<AddChargeRequest>, number, string][])("refuses %s, storing nothing", async (_name, change, status, code) => {
    const { db, state } = fakeDb();
    await expect(saveAddCharge(db, { ...BASE, ...change })).rejects.toMatchObject({ status, code });
    expect(state).toMatchObject({ charges: [], groups: [], keys: [] });
  });

  it("saves the fixed fields after a refusal with the same key", async () => {
    const { db, state } = fakeDb();
    await expect(saveAddCharge(db, { ...BASE, dueDate: null })).rejects.toMatchObject({ code: "no_date" });
    await saveAddCharge(db, BASE);
    expect(state.charges).toHaveLength(4);
  });
});

describe("saveAddCharge: corrections", () => {
  const correction = (chargeId: string | null, amountCents: number | null, dueDate: string | null = "2026-11-30"): AddChargeRequest => ({
    ...BASE,
    // Charge mode's fields are ignored, however they stand.
    kind: null,
    mode: "CORRECTION",
    correction: { personId: null, month: null, chargeId, amountCents, dueDate },
  });

  it("saves a refund in the newest month, already paid today by whoever paid the original, linked to it", async () => {
    const { db, state } = fakeDb();
    const response = await saveAddCharge(db, correction("sep-utilities-sam", 7746));
    expect(response).toEqual({ month: "2026-11", chargeGroupId: null, chargeIds: ["charge-1"] });
    expect(state.charges).toEqual([]);
    expect(state.groups).toEqual([]);
    expect(state.corrections).toHaveLength(1);
    const [row] = state.corrections;
    expect(row).toMatchObject({
      id: "charge-1",
      month: "2026-11",
      personId: sam,
      payViaPersonId: priya,
      category: "CORRECTION",
      label: "Utilities correction (Sep)",
      amountCents: -500,
      householdVersionId: "version-nov",
      correctsChargeId: "sep-utilities-sam",
      correctsMonth: "2026-09",
      correctsCategory: "UTILITIES",
      paidCents: -500,
      paidByPersonId: priya,
    });
    expect([row.dueDate.toISOString(), row.paidOn?.toISOString()]).toEqual(["2026-11-24T00:00:00.000Z", "2026-11-24T00:00:00.000Z"]);
  });

  it("saves a higher amount as an unpaid charge due on the picked date", async () => {
    const { db, state } = fakeDb();
    await saveAddCharge(db, correction("oct-fridge-jordan", 3500));
    expect(state.corrections).toMatchObject([
      { personId: jordan, payViaPersonId: null, amountCents: 500, paidCents: null, paidOn: null, paidByPersonId: null, correctsChargeId: "oct-fridge-jordan" },
    ]);
    expect(state.corrections[0].dueDate.toISOString()).toBe("2026-11-30T00:00:00.000Z");
  });

  it("answers a repeated key with the first response and saves nothing more", async () => {
    const { db, state } = fakeDb();
    const first = await saveAddCharge(db, correction("oct-fridge-jordan", 3500));
    expect(await saveAddCharge(db, correction("oct-fridge-jordan", 9000))).toEqual(first);
    expect(state.corrections).toHaveLength(1);
  });

  it.each([
    ["no charge picked", correction(null, 100), 422, "no_pick"],
    ["an unknown charge", correction("nope", 100), 404, "no_charge"],
    ["a correction", correction("oct-correction-jordan", 100), 409, "is_correction"],
    ["the owner's charge", correction("oct-utilities-alex", 100), 409, "owner_charge"],
    ["rent", correction("oct-rent-jordan", 100), 409, "not_correctable"],
    ["an unpaid charge", correction("nov-utilities-jordan", 100), 409, "unpaid"],
    ["someone no longer in the household", correction("sep-utilities-former", 100), 404, "no_person"],
    ["no amount", correction("oct-fridge-jordan", null), 422, "no_amount"],
    ["a negative amount", correction("oct-fridge-jordan", -100), 422, "negative_amount"],
    ["an unchanged amount", correction("oct-utilities-jordan", 7746), 422, "unchanged"],
    ["a higher amount with no due date", correction("oct-fridge-jordan", 3500, null), 422, "no_date"],
  ] as [string, AddChargeRequest, number, string][])("refuses %s, storing nothing", async (_name, request, status, code) => {
    const { db, state } = fakeDb();
    await expect(saveAddCharge(db, request)).rejects.toMatchObject({ status, code });
    expect(state).toMatchObject({ corrections: [], keys: [] });
  });
});
