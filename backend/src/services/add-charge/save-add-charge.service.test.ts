import { HOUSEHOLD_SCHEMA_VERSION, type AddChargeRequest } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { saveAddCharge, type SaveAddChargeDb, type SaveAddChargeTx } from "./save-add-charge.service";

const { alex, priya, sam, jordan } = PERSON_IDS;

type ChargeRow = Parameters<SaveAddChargeTx["charge"]["createManyAndReturn"]>[0]["data"][number] & { id: string };

/** An in-memory database with November open. A failed transaction keeps nothing, as Postgres would. */
function fakeDb(opts: { open?: boolean; keys?: { key: string; endpoint: string; response: unknown }[] } = {}) {
  const state = {
    charges: [] as ChargeRow[],
    groups: [] as { id: string; scope: string; splitMethod: string; totalCents: number }[],
    keys: [...(opts.keys ?? [])],
  };
  let next = 0;
  const tx: SaveAddChargeTx = {
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
      const before = { charges: [...state.charges], groups: [...state.groups], keys: [...state.keys] };
      try {
        return await fn(tx);
      } catch (err) {
        Object.assign(state, before);
        throw err;
      }
    },
  };
  return { db, state };
}

const BASE: AddChargeRequest = {
  idempotencyKey: "key-00000001",
  kind: "ONE_OFF",
  label: "Fridge repair",
  amountCents: 12000,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  dueDate: "2026-12-05",
};

describe("saveAddCharge", () => {
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
