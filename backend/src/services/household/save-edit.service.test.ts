import {
  HOUSEHOLD_SCHEMA_VERSION,
  type HouseholdAddPersonEdit,
  type HouseholdConfig,
  type HouseholdEdit,
  type HouseholdHomeEdit,
  type HouseholdPersonEdit,
  type HouseholdSplitEdit,
  type PersonColor,
} from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { masterRentCents } from "@/lib/household/room-amounts";
import {
  previewHouseholdEdit,
  saveHouseholdEdit,
  type HouseholdEditDb,
  type HouseholdEditTx,
} from "./save-edit.service";

interface VersionRow {
  id: string;
  startsFromMonth: string;
  schemaVersion: number;
  config: unknown;
}

interface PersonRow {
  id: string;
  name: string;
  whatsappE164: string | null;
  color: PersonColor;
  isOwner: boolean;
}

const version = (startsFromMonth: string, config: HouseholdConfig): VersionRow => ({
  id: `version-${startsFromMonth}`,
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

describe("recurring charges", () => {
  const edit = { kind: "recurring", chargeId: null, label: "Parking", amountCents: 1000, personId: PERSON_IDS.jordan, endMonth: null } as const;
  const recurringOf = (row: VersionRow | undefined) => (row?.config as HouseholdConfig).recurring;

  it("adds a charge to next month's version, leaving the opened month alone", async () => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, edit)).toEqual({ savedFromMonth: "2026-12" });
    expect(recurringOf(state.versions.find((v) => v.startsFromMonth === "2026-11"))).toHaveLength(1);
    expect(recurringOf(state.versions.find((v) => v.startsFromMonth === "2026-12"))?.at(-1)?.label).toBe("Parking");
  });

  it("adds to next month's version when one is already upcoming", async () => {
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", JAN_2027_CONFIG)]);
    await saveHouseholdEdit(db, edit);
    await saveHouseholdEdit(db, { ...edit, label: "Storage" });
    expect(state.versions).toHaveLength(2);
    expect(recurringOf(state.versions[1])?.map((r) => r.label).slice(-2)).toEqual(["Parking", "Storage"]);
  });

  it("refuses to change a version a month has opened using", async () => {
    const next = version("2026-12", NOV_2026_CONFIG);
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), next], [next.id]);
    await expect(saveHouseholdEdit(db, edit)).rejects.toMatchObject({ status: 409, code: "version_locked" });
  });

  it("answers the preview's errors, and refuses them on save", async () => {
    const { db } = fakeDb();
    const bad = { ...edit, amountCents: 0 };
    const preview = await previewHouseholdEdit(db, bad);
    expect(preview).toMatchObject({ canSave: false, errors: { amountCents: "Enter an amount." } });
    await expect(saveHouseholdEdit(db, bad)).rejects.toMatchObject({ status: 422, code: "invalid_edit" });
  });

  it("removes a charge from next month only", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, { kind: "removeRecurring", chargeId: "recurring-starhub" });
    expect(recurringOf(state.versions.find((v) => v.startsFromMonth === "2026-11"))).toHaveLength(1);
    expect(recurringOf(state.versions.find((v) => v.startsFromMonth === "2026-12"))).toEqual([]);
  });

  it("answers 404 for a charge not running next month", async () => {
    const { db } = fakeDb();
    await expect(previewHouseholdEdit(db, { ...edit, chargeId: "nope" })).rejects.toMatchObject({ status: 404, code: "no_charge" });
    await expect(saveHouseholdEdit(db, { kind: "removeRecurring", chargeId: "nope" })).rejects.toMatchObject({ status: 404, code: "no_charge" });
  });
});

const PEOPLE: PersonRow[] = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6590000001", color: "BLUE", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6590000003", color: "GREEN", isOwner: false },
];

/**
 * An in-memory household. `lockedIds` are versions a month has opened using; `opened` is the newest open month, null
 * in First run.
 */
function fakeDb(
  versions: VersionRow[] = [version("2026-11", NOV_2026_CONFIG)],
  lockedIds: string[] = [],
  {
    opened = "2026-11",
    people = PEOPLE,
    setup = { startMonth: null, doneSteps: [] },
  }: { opened?: string | null; people?: PersonRow[]; setup?: { startMonth: string | null; doneSteps: string[] } } = {},
) {
  const state = {
    versions: [...versions],
    people: [...people],
    setup: { ...setup },
  };
  const tx: HouseholdEditTx = {
    month: { findFirst: async () => (opened ? { month: opened } : null) },
    setup: {
      findUnique: async () => state.setup,
      upsert: async ({ update }) => {
        state.setup = { startMonth: update.startMonth ?? state.setup.startMonth, doneSteps: update.doneSteps };
        return state.setup;
      },
    },
    householdVersion: {
      findMany: async () => state.versions,
      updateMany: async ({ where, data }) => {
        if (lockedIds.includes(where.id)) return { count: 0 };
        state.versions = state.versions.map((v) => (v.id === where.id ? { ...v, ...data } : v));
        return { count: 1 };
      },
      create: async ({ data }) => {
        state.versions.push({ id: `version-${data.startsFromMonth}`, ...data });
      },
    },
    person: {
      findMany: async () => state.people,
      update: async ({ where, data }) => {
        state.people = state.people.map((p) => (p.id === where.id ? { ...p, ...data } : p));
      },
      create: async ({ data }) => {
        state.people.push(data);
      },
      delete: async ({ where }) => {
        state.people = state.people.filter((p) => p.id !== where.id);
      },
    },
  };
  const db: HouseholdEditDb = {
    ...tx,
    $transaction: async (fn) => {
      const snapshot = structuredClone(state);
      try {
        return await fn(tx);
      } catch (err) {
        Object.assign(state, snapshot);
        throw err;
      }
    },
  };
  return { db, state };
}

const edit = (fields: Partial<HouseholdPersonEdit> = {}): HouseholdPersonEdit => ({
  kind: "person",
  personId: PERSON_IDS.jordan,
  ...fields,
});

const jordanIn = (row: VersionRow | undefined) =>
  (row?.config as HouseholdConfig).people.find((p) => p.personId === PERSON_IDS.jordan);

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("previewHouseholdEdit", () => {
  it("lists only what changed, in the two groups, and stores nothing", async () => {
    const { db, state } = fakeDb();
    const preview = await previewHouseholdEdit(
      db,
      edit({ name: "Jo", color: "PURPLE", rentDueDay: 9, depositCents: 95000 }),
    );
    expect(preview.groups).toEqual([
      {
        title: "Saves now",
        rows: [
          { label: "Name", from: "Jordan", to: "Jo" },
          { label: "Color", from: "Green", to: "Purple" },
        ],
      },
      { title: "Saves from Dec 2026", rows: [{ label: "Rent due", from: "1st", to: "9th" }] },
    ]);
    expect(preview.canSave).toBe(true);
    expect(preview.errors).toEqual({});
    expect(state.versions).toHaveLength(1);
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.name).toBe("Jordan");
  });

  it("has no groups and no Save when nothing changed", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ name: "Jordan", color: "GREEN", rentDueDay: 1, utilitiesDueDay: 4 }),
    );
    expect(preview).toEqual({ groups: [], canSave: false, errors: {} });
  });

  it("shows due days as text", async () => {
    const { groups } = await previewHouseholdEdit(fakeDb().db, edit({ utilitiesDueDay: 9 }));
    expect(groups[0].rows).toEqual([{ label: "Utilities due", from: "4th", to: "9th" }]);
  });

  it("ignores rent, shares and units, which Landlord & rooms and the split page edit", async () => {
    const fields = { rentCents: 100000, utilityShares: 1500, airconUnits: 2 } as Partial<HouseholdPersonEdit>;
    expect(await previewHouseholdEdit(fakeDb().db, edit(fields))).toEqual({ groups: [], canSave: false, errors: {} });
  });

  it("lists only this edit's changes, not ones saved earlier for next month", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", JAN_2027_CONFIG)]);
    const preview = await previewHouseholdEdit(db, edit({ depositCents: 12345 }));
    expect(preview.groups[0].rows.map((row) => row.label)).toEqual(["Deposit"]);
  });

  it("has no groups when nothing changed, even with values saved earlier for next month", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", JAN_2027_CONFIG)]);
    expect((await previewHouseholdEdit(db, edit())).groups).toEqual([]);
  });

  it.each([
    ["an empty name", { name: "  " }, "name"],
    ["a bad number", { whatsappE164: "12345" }, "whatsappE164"],
    ["Teal for a tenant", { color: "TEAL" as const }, "color"],
    ["a negative deposit", { depositCents: -1 }, "depositCents"],
    ["a day out of range", { rentDueDay: 32 }, "rentDueDay"],
    ["a direct payer's due day cleared", { rentDueDay: null }, "rentDueDay"],
    ["a route via themselves", { rentViaPersonId: PERSON_IDS.jordan }, "rentViaPersonId"],
    ["a route via the owner", { utilitiesViaPersonId: PERSON_IDS.alex }, "utilitiesViaPersonId"],
    ["a route via someone not in the version", { rentViaPersonId: "person-nobody" }, "rentViaPersonId"],
  ])("returns %s as a field error", async (_name, fields, field) => {
    const preview = await previewHouseholdEdit(fakeDb().db, edit(fields));
    expect(preview.errors[field]).toBeTruthy();
    expect(preview.canSave).toBe(false);
  });

  it("does not let the primary tenant hold a deposit", async () => {
    const preview = await previewHouseholdEdit(fakeDb().db, edit({ personId: PERSON_IDS.priya, depositCents: 100000 }));
    expect(preview.errors.depositCents).toBe("This comes from the split.");
  });

  it("lets a person paying via someone have no due day", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ personId: PERSON_IDS.sam, utilitiesDueDay: null }),
    );
    expect(preview.errors).toEqual({});
  });

  it("lists a changed route as text, without an aircon row", async () => {
    const { groups, canSave } = await previewHouseholdEdit(
      fakeDb().db,
      edit({ rentViaPersonId: PERSON_IDS.priya, utilitiesViaPersonId: PERSON_IDS.priya }),
    );
    expect(groups[0].rows).toEqual([
      { label: "Rent paid", from: "Directly", to: "Via Priya" },
      { label: "Utilities paid", from: "Directly", to: "Via Priya" },
    ]);
    expect(canSave).toBe(true);
  });

  it("refuses a route via someone who pays via someone", async () => {
    const preview = await previewHouseholdEdit(fakeDb().db, edit({ rentViaPersonId: PERSON_IDS.sam }));
    expect(preview.errors.rentViaPersonId).toBe("This person pays via someone, so choose someone who pays directly.");
    expect(preview.canSave).toBe(false);
  });

  it("refuses a route for someone others pay via", async () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) =>
        p.personId === PERSON_IDS.sam ? { ...p, routes: { RENT: { kind: "VIA", viaPersonId: PERSON_IDS.jordan } } } : p,
      ),
    };
    const { db } = fakeDb([version("2026-11", config)]);
    const preview = await previewHouseholdEdit(db, edit({ utilitiesViaPersonId: PERSON_IDS.priya }));
    expect(preview.errors.utilitiesViaPersonId).toBe("Someone pays via this person, so they have to pay directly.");
    expect(preview.canSave).toBe(false);
  });

  it("has no groups when the route is the saved one", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ personId: PERSON_IDS.sam, rentViaPersonId: null, utilitiesViaPersonId: PERSON_IDS.priya }),
    );
    expect(preview).toEqual({ groups: [], canSave: false, errors: {} });
  });

  it("does not let the primary tenant or the owner have a route", async () => {
    for (const personId of [PERSON_IDS.priya, PERSON_IDS.alex]) {
      const preview = await previewHouseholdEdit(fakeDb().db, edit({ personId, rentViaPersonId: PERSON_IDS.jordan }));
      expect(preview.errors.rentViaPersonId).toBe("Only tenants can pay via someone.");
      expect(preview.canSave).toBe(false);
    }
  });

  it("asks for a due day when someone with none starts paying directly", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ personId: PERSON_IDS.sam, utilitiesViaPersonId: null }),
    );
    expect(preview.errors.utilitiesDueDay).toBe("Enter a day from 1 to 31.");
    expect(preview.canSave).toBe(false);
  });

  it("takes a direct route with the due day it needs", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ personId: PERSON_IDS.sam, utilitiesViaPersonId: null, utilitiesDueDay: 7 }),
    );
    expect(preview.errors).toEqual({});
    expect(preview.groups[0].rows).toEqual([
      { label: "Utilities due", from: "—", to: "7th" },
      { label: "Utilities paid", from: "Via Priya", to: "Directly" },
    ]);
  });

  it("lets someone clear a due day once they pay via someone", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ utilitiesViaPersonId: PERSON_IDS.priya, utilitiesDueDay: null }),
    );
    expect(preview.errors).toEqual({});
    expect(preview.canSave).toBe(true);
  });
});

describe("saveHouseholdEdit", () => {
  it("stores a route on next month's version, and leaves the current one alone", async () => {
    const { db, state } = fakeDb();
    const saved = await saveHouseholdEdit(db, edit({ utilitiesViaPersonId: PERSON_IDS.priya }));
    expect(saved).toEqual({ savedFromMonth: "2026-12" });
    const via = { kind: "VIA", viaPersonId: PERSON_IDS.priya };
    expect(jordanIn(state.versions[1])?.routes).toEqual({ UTILITIES: via, AIRCON: via });
    expect(jordanIn(state.versions[0])?.routes).toEqual({});
  });

  it("refuses a route via the owner with 422", async () => {
    const { db, state } = fakeDb();
    await expect(saveHouseholdEdit(db, edit({ rentViaPersonId: PERSON_IDS.alex }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    expect(state.versions).toHaveLength(1);
  });

  it("creates a version for next month, from the version in effect", async () => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, edit({ depositCents: 100000 }))).toEqual({ savedFromMonth: "2026-12" });
    expect(state.versions).toHaveLength(2);
    const created = state.versions.find((v) => v.startsFromMonth === "2026-12");
    expect(created?.schemaVersion).toBe(HOUSEHOLD_SCHEMA_VERSION);
    expect(jordanIn(created)?.depositCents).toBe(100000);
    expect(jordanIn(state.versions[0])?.depositCents).toBe(95000);
  });

  it("adds three edits for one month to one version", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, edit({ utilitiesDueDay: 8 }));
    await saveHouseholdEdit(db, edit({ rentDueDay: 9 }));
    await saveHouseholdEdit(db, edit({ depositCents: 100000 }));
    expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", "2026-12"]);
    expect(jordanIn(state.versions[1])).toMatchObject({
      dueDays: { RENT: 9, UTILITIES: 8 },
      depositCents: 100000,
    });
  });

  it("refuses to update a version a month has opened using, storing nothing", async () => {
    const dec = version("2026-12", JAN_2027_CONFIG);
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), dec], [dec.id]);
    await expect(saveHouseholdEdit(db, edit({ depositCents: 12345, name: "Jo" }))).rejects.toMatchObject({
      status: 409,
      code: "version_locked",
    });
    expect(jordanIn(state.versions[1])?.depositCents).not.toBe(12345);
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.name).toBe("Jordan");
  });

  it.each([
    ["name", { name: "Jo" }, { name: "Jo" }],
    ["WhatsApp", { whatsappE164: "+6590000009" }, { whatsappE164: "+6590000009" }],
    ["color", { color: "PURPLE" as const }, { color: "PURPLE" }],
  ])("saves a change to only %s with no new version", async (_name, fields, expected) => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, edit(fields))).toEqual({ savedFromMonth: null });
    expect(state.versions).toHaveLength(1);
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)).toMatchObject(expected);
  });

  it("renames the primary tenant under Saves now, with no new version", async () => {
    const { db, state } = fakeDb();
    const rename = edit({ personId: PERSON_IDS.priya, name: "Pia" });
    expect((await previewHouseholdEdit(db, rename)).groups).toEqual([
      { title: "Saves now", rows: [{ label: "Name", from: "Priya", to: "Pia" }] },
    ]);
    expect(await saveHouseholdEdit(db, rename)).toEqual({ savedFromMonth: null });
    expect(state.versions).toHaveLength(1);
    expect(state.people.find((p) => p.id === PERSON_IDS.priya)?.name).toBe("Pia");
  });

  it("saves the primary tenant's due days from next month", async () => {
    const { db, state } = fakeDb();
    const dueDays = edit({ personId: PERSON_IDS.priya, rentDueDay: 9, utilitiesDueDay: 9 });
    expect((await previewHouseholdEdit(db, dueDays)).groups).toEqual([
      {
        title: "Saves from Dec 2026",
        rows: [
          { label: "Rent due", from: "7th", to: "9th" },
          { label: "Utilities due", from: "7th", to: "9th" },
        ],
      },
    ]);
    expect(await saveHouseholdEdit(db, dueDays)).toEqual({ savedFromMonth: "2026-12" });
    const saved = (state.versions.at(-1)?.config as HouseholdConfig).people.find((p) => p.personId === PERSON_IDS.priya);
    expect(saved?.dueDays).toMatchObject({ RENT: 9, UTILITIES: 9, AIRCON: 9 });
  });

  it("clears a WhatsApp number", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, edit({ whatsappE164: null }));
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.whatsappE164).toBeNull();
  });

  it("saves the row and the version together", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, edit({ name: "Jo", rentDueDay: 9 }));
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.name).toBe("Jo");
    expect(state.versions).toHaveLength(2);
  });

  it("refuses Teal for a tenant and allows it for the owner", async () => {
    await expect(saveHouseholdEdit(fakeDb().db, edit({ color: "TEAL" }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    const { db, state } = fakeDb();
    state.people = state.people.map((p) => (p.isOwner ? { ...p, color: "BLUE" } : p));
    await saveHouseholdEdit(db, edit({ personId: PERSON_IDS.alex, color: "TEAL" }));
    expect(state.people.find((p) => p.isOwner)?.color).toBe("TEAL");
  });

  it("answers 422 no_changes when there is nothing to store", async () => {
    await expect(saveHouseholdEdit(fakeDb().db, edit({ name: "Jordan" }))).rejects.toMatchObject({
      status: 422,
      code: "no_changes",
    });
  });

  it("answers 404 no_person for an unknown person", async () => {
    await expect(saveHouseholdEdit(fakeDb().db, edit({ personId: "nobody" }))).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });

  it("answers 404 no_person for someone not in next month's version", async () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan) };
    await expect(saveHouseholdEdit(fakeDb([version("2026-11", config)]).db, edit({ name: "Jo" }))).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });

  it("answers 404 no_version when no version covers next month", async () => {
    const { db } = fakeDb([version("2027-06", NOV_2026_CONFIG)]);
    await expect(saveHouseholdEdit(db, edit({ rentDueDay: 9 }))).rejects.toMatchObject({
      status: 404,
      code: "no_version",
    });
  });

  it("answers 404 no_version when a month is open but there is no version", async () => {
    await expect(saveHouseholdEdit(fakeDb([]).db, edit({ name: "Jo" }))).rejects.toMatchObject({
      status: 404,
      code: "no_version",
    });
  });

  it("answers 409 version_conflict when a second save creates the month first", async () => {
    const { db } = fakeDb();
    db.$transaction = async () => {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    };
    await expect(saveHouseholdEdit(db, edit({ rentDueDay: 9 }))).rejects.toMatchObject({
      status: 409,
      code: "version_conflict",
    });
  });
});

describe("adding a person", () => {
  const add: HouseholdAddPersonEdit = {
    kind: "addPerson",
    name: "Casey",
    whatsappE164: null,
    color: "PURPLE",
    roomId: "room-4",
    utilityShares: 1000,
    depositCents: 0,
    rentDueDay: 3,
    utilitiesDueDay: 5,
    rentViaPersonId: null,
    utilitiesViaPersonId: null,
  };
  /** The config with an empty Room 4 for the new tenant. */
  const withRoom = (config: HouseholdConfig): HouseholdConfig => ({
    ...config,
    rooms: [...config.rooms, { id: "room-4", roomType: "TENANT", name: "Room 4", airconUnits: 1, rentCents: 90000, includeInTotal: true }],
  });
  const dec = (versions: VersionRow[]) => versions.find((v) => v.startsFromMonth === "2026-12");
  const inDec = (versions: VersionRow[]) => (dec(versions)?.config as HouseholdConfig).people;

  it("previews with no groups and stores nothing", async () => {
    const { db, state } = fakeDb([version("2026-11", withRoom(NOV_2026_CONFIG))]);
    expect(await previewHouseholdEdit(db, add)).toEqual({ groups: [], canSave: true, errors: {} });
    expect(state.versions).toHaveLength(1);
    expect(state.people).toHaveLength(4);
  });

  it("creates the row and next month's version, leaving this month's as it was", async () => {
    const { db, state } = fakeDb([version("2026-11", withRoom(NOV_2026_CONFIG))]);
    expect(await saveHouseholdEdit(db, add)).toEqual({ savedFromMonth: "2026-12" });
    const row = state.people[4];
    expect(row).toMatchObject({ name: "Casey", whatsappE164: null, color: "PURPLE", isOwner: false });
    expect(inDec(state.versions).at(-1)).toMatchObject({ personId: row.id, roomId: "room-4" });
    expect((state.versions[0].config as HouseholdConfig).people).toEqual(NOV_2026_CONFIG.people);
  });

  it("adds to the version already waiting for next month, so earlier edits stay", async () => {
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", withRoom(JAN_2027_CONFIG))]);
    await saveHouseholdEdit(db, add);
    expect(state.versions).toHaveLength(2);
    expect(inDec(state.versions).slice(0, -1)).toEqual(JAN_2027_CONFIG.people);
  });

  it("leaves no row behind when the version is locked", async () => {
    const { db, state } = fakeDb(
      [version("2026-11", NOV_2026_CONFIG), version("2026-12", withRoom(JAN_2027_CONFIG))],
      ["version-2026-12"],
    );
    await expect(saveHouseholdEdit(db, add)).rejects.toMatchObject({ status: 409, code: "version_locked" });
    expect(state.people).toHaveLength(4);
  });

  it("refuses to save with a required field empty or a value wrong", async () => {
    const { db, state } = fakeDb([version("2026-11", withRoom(NOV_2026_CONFIG))]);
    await expect(saveHouseholdEdit(db, { ...add, roomId: null })).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    await expect(saveHouseholdEdit(db, { ...add, utilityShares: -1 })).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    expect(state.people).toHaveLength(4);
    expect(state.versions).toHaveLength(1);
  });

  it("refuses a room that was taken since the form opened, storing nothing", async () => {
    const { db, state } = fakeDb();
    const taken = { ...add, roomId: ROOM_IDS.room3 };
    expect(await previewHouseholdEdit(db, taken)).toEqual({
      groups: [],
      canSave: false,
      errors: { roomId: "Choose an empty room." },
    });
    await expect(saveHouseholdEdit(db, taken)).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
      message: "Choose an empty room.",
    });
    expect(state.people).toHaveLength(4);
    expect(state.versions).toHaveLength(1);
  });

  it("answers 404 no_version when a month is open but there is no version", async () => {
    await expect(saveHouseholdEdit(fakeDb([]).db, add)).rejects.toMatchObject({ status: 404, code: "no_version" });
  });
});

describe("editing landlord and rooms", () => {
  const home = (fields: Partial<HouseholdHomeEdit> = {}): HouseholdHomeEdit => ({
    kind: "home",
    rooms: [],
    newRooms: [],
    removedRoomIds: [],
    ...fields,
  });
  const configOf = (row: VersionRow | undefined) => row?.config as HouseholdConfig;

  it("previews with the summary, warnings and master rent, and stores nothing", async () => {
    const { db, state } = fakeDb();
    const preview = await previewHouseholdEdit(db, home({ landlordRentCents: 440000 }));
    expect(preview).toMatchObject({
      canSave: true,
      errors: {},
      warnings: {},
      masterRent: "$3,450.00",
    });
    expect(preview.groups[0].title).toBe("Saves from Dec 2026");
    expect(state.versions).toHaveLength(1);
  });

  it("creates next month's version, leaving the current one and the people alone", async () => {
    const { db, state } = fakeDb();
    const peopleBefore = structuredClone(state.people);
    await expect(saveHouseholdEdit(db, home({ landlordRentCents: 440000 }))).resolves.toEqual({ savedFromMonth: "2026-12" });
    expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", "2026-12"]);
    expect(configOf(state.versions[0]).categories.rent.landlordRentCents).toBe(430000);
    expect(configOf(state.versions[1]).categories.rent.landlordRentCents).toBe(440000);
    expect(masterRentCents(configOf(state.versions[1]))).toBe(345000);
    expect(state.people).toEqual(peopleBefore);
  });

  it("adds to a version that starts next month, so several edits add up", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, home({ landlordRentCents: 440000 }));
    await saveHouseholdEdit(db, home({ landlordDueDay: 5 }));
    expect(state.versions).toHaveLength(2);
    expect(configOf(state.versions[1]).categories.rent).toMatchObject({ landlordRentCents: 440000, landlordDueDay: 5 });
  });

  it("stores a new room with a server-made id", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, home({ newRooms: [{ roomType: "COMMON", name: "Study", airconUnits: 1 }] }));
    const added = configOf(state.versions[1]).rooms.at(-1);
    expect(added).toMatchObject({ roomType: "COMMON", name: "Study", airconUnits: 1 });
    expect(added?.id).toBeTruthy();
  });

  it("refuses a version a month has opened using", async () => {
    const { db } = fakeDb(
      [version("2026-11", NOV_2026_CONFIG), version("2026-12", NOV_2026_CONFIG)],
      ["version-2026-12"],
    );
    await expect(saveHouseholdEdit(db, home({ landlordRentCents: 440000 }))).rejects.toMatchObject({
      status: 409,
      code: "version_locked",
    });
  });

  it("refuses a failed rule with 422, storing nothing", async () => {
    const { db, state } = fakeDb();
    await expect(saveHouseholdEdit(db, home({ landlordRentCents: 90000 }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    await expect(saveHouseholdEdit(db, home({ removedRoomIds: [ROOM_IDS.room2] }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    expect(state.versions).toHaveLength(1);
  });

  it("refuses an edit with nothing to save", async () => {
    const { db } = fakeDb();
    await expect(saveHouseholdEdit(db, home({ landlordRentCents: 430000 }))).rejects.toMatchObject({
      status: 422,
      code: "no_changes",
    });
  });

  it("allows Save past a warning", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, home({ rooms: [{ id: ROOM_IDS.room2, rentCents: 0 }] }));
    expect(masterRentCents(configOf(state.versions[1]))).toBe(430000);
  });
});

describe("editing the household split", () => {
  const split = (fields: Partial<HouseholdSplitEdit> = {}): HouseholdSplitEdit => ({ kind: "split", tenantShares: [], ...fields });
  const configOf = (row: VersionRow | undefined) => row?.config as HouseholdConfig;

  it("previews with the summary, warnings and amounts, and stores nothing", async () => {
    const { db, state } = fakeDb();
    const preview = await previewHouseholdEdit(db, split({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 0 }] }));
    expect(preview).toMatchObject({
      canSave: true,
      errors: {},
      warnings: { [`tenantShares.${PERSON_IDS.sam}`]: "Sam utilities is 0" },
    });
    expect(preview.groups[0].title).toBe("Saves from Dec 2026");
    expect(preview.amounts?.utilities).toMatchObject({ left: "4", owner: "2 shares", primary: "2 shares" });
    expect(state.versions).toHaveLength(1);
  });

  it("creates next month's version, leaving the current one and the people alone", async () => {
    const { db, state } = fakeDb();
    const peopleBefore = structuredClone(state.people);
    await expect(saveHouseholdEdit(db, split({ utilitiesPrimaryShares: 1200 }))).resolves.toEqual({ savedFromMonth: "2026-12" });
    expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", "2026-12"]);
    expect(configOf(state.versions[0]).categories.utilities.primaryBps).toBe(5000);
    expect(configOf(state.versions[1]).categories.utilities).toMatchObject({ ownerBps: 6000, primaryBps: 4000 });
    expect(state.people).toEqual(peopleBefore);
  });

  it("adds to a version that starts next month, so several edits add up", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, split({ utilitiesPrimaryShares: 1200 }));
    await saveHouseholdEdit(db, split({ totalShares: 6000 }));
    expect(state.versions).toHaveLength(2);
    expect(configOf(state.versions[1]).categories.utilities).toMatchObject({ primaryBps: 4000, totalShares: 6000 });
  });

  it("refuses a version a month has opened using", async () => {
    const { db } = fakeDb(
      [version("2026-11", NOV_2026_CONFIG), version("2026-12", NOV_2026_CONFIG)],
      ["version-2026-12"],
    );
    await expect(saveHouseholdEdit(db, split({ utilitiesPrimaryShares: 1200 }))).rejects.toMatchObject({
      status: 409,
      code: "version_locked",
    });
  });

  it("refuses a failed rule with 422, storing nothing", async () => {
    const { db, state } = fakeDb();
    await expect(saveHouseholdEdit(db, split({ totalShares: 2000 }))).rejects.toMatchObject({ status: 422, code: "invalid_edit" });
    await expect(
      saveHouseholdEdit(db, split({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: null }] })),
    ).rejects.toMatchObject({ status: 422, code: "invalid_edit" });
    expect(state.versions).toHaveLength(1);
  });

  it("refuses an edit with nothing to save", async () => {
    const { db } = fakeDb();
    await expect(saveHouseholdEdit(db, split({ totalShares: 5000 }))).rejects.toMatchObject({ status: 422, code: "no_changes" });
  });

  it("allows Save past a warning", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, split({ tenantShares: [{ personId: PERSON_IDS.sam, utilityShares: 0 }] }));
    expect(configOf(state.versions[1]).people.find((p) => p.personId === PERSON_IDS.sam)?.utilityShares).toBe(0);
  });

  it("still needs a direct payer's utilities due day at 0 shares, since it also sets aircon", async () => {
    const { db } = fakeDb();
    await saveHouseholdEdit(db, split({ tenantShares: [{ personId: PERSON_IDS.jordan, utilityShares: 0 }] }));
    const cleared = await previewHouseholdEdit(db, edit({ utilitiesDueDay: null }));
    expect(cleared.errors.utilitiesDueDay).toBe("Enter a day from 1 to 31.");
  });
});

describe("removing a person", () => {
  const remove = { kind: "removePerson", personId: PERSON_IDS.jordan } as const;
  const dec = (versions: VersionRow[]) => versions.find((v) => v.startsFromMonth === "2026-12")?.config as HouseholdConfig;

  it("previews with no groups and stores nothing", async () => {
    const { db, state } = fakeDb();
    expect(await previewHouseholdEdit(db, remove)).toEqual({ groups: [], canSave: true, errors: {} });
    expect(state.versions).toHaveLength(1);
  });

  it("takes them out from next month, keeping this month's version and their row", async () => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, remove)).toEqual({ savedFromMonth: "2026-12" });
    expect(dec(state.versions).people.map((p) => p.personId)).not.toContain(PERSON_IDS.jordan);
    expect((state.versions[0].config as HouseholdConfig).people).toEqual(NOV_2026_CONFIG.people);
    expect(state.people.some((p) => p.id === PERSON_IDS.jordan)).toBe(true);
  });

  it("refuses while someone pays via them, storing nothing", async () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) =>
        p.personId === PERSON_IDS.sam ? { ...p, routes: { RENT: { kind: "VIA", viaPersonId: PERSON_IDS.jordan } } } : p,
      ),
    };
    const { db, state } = fakeDb([version("2026-11", config)]);
    await expect(saveHouseholdEdit(db, remove)).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
      message: "This person has payment routed to them. Please redirect the payment before removing.",
    });
    expect(state.versions).toHaveLength(1);
  });

  it("answers 404 no_person the second time", async () => {
    const { db } = fakeDb();
    await saveHouseholdEdit(db, remove);
    await expect(saveHouseholdEdit(db, remove)).rejects.toMatchObject({ status: 404, code: "no_person" });
  });

  it("answers 409 version_locked when a month has opened using the version", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", NOV_2026_CONFIG)], ["version-2026-12"]);
    await expect(saveHouseholdEdit(db, remove)).rejects.toMatchObject({ status: 409, code: "version_locked" });
  });
});

describe("First run (no month open)", () => {
  const ALEX = PEOPLE[0];
  /** The first version after Rent & rooms: the owner alone, with an empty Room 4. */
  const OWNER_ONLY: HouseholdConfig = {
    rooms: [
      { id: ROOM_IDS.master, roomType: "MASTER", name: "Master room", airconUnits: 1 },
      { id: "room-4", roomType: "TENANT", name: "Room 4", airconUnits: 1, rentCents: 90000, includeInTotal: true },
    ],
    people: [{ personId: PERSON_IDS.alex, role: "OWNER", roomId: ROOM_IDS.master, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 }],
    categories: {
      rent: { landlordRentCents: 300000, landlordDueDay: 1, ownerBps: 10000, primaryBps: 0 },
      utilities: { totalShares: 1000, ownerBps: 10000, primaryBps: 0 },
      aircon: { ownerBps: 10000, primaryBps: 0 },
    },
    recurring: [],
  };
  const firstHome = (fields: Partial<HouseholdHomeEdit> = {}): HouseholdHomeEdit => ({
    kind: "home",
    landlordRentCents: 300000,
    landlordDueDay: 1,
    billDueDay: null,
    rooms: [],
    newRooms: [{ roomType: "MASTER", name: "Master room", airconUnits: 1 }],
    removedRoomIds: [],
    ...fields,
  });
  const homeEdit = (fields: Partial<HouseholdHomeEdit>): HouseholdHomeEdit => ({ kind: "home", rooms: [], newRooms: [], removedRoomIds: [], ...fields });
  const addPrimary: HouseholdAddPersonEdit = {
    kind: "addPerson",
    name: "Priya",
    whatsappE164: null,
    color: "BLUE",
    roomId: ROOM_IDS.master,
    utilityShares: null,
    depositCents: 0,
    rentDueDay: 7,
    utilitiesDueDay: 7,
    rentViaPersonId: null,
    utilitiesViaPersonId: null,
  };
  const addTenant: HouseholdAddPersonEdit = { ...addPrimary, name: "Casey", roomId: "room-4", utilityShares: 1000 };
  const fresh = (people: PersonRow[] = [], doneSteps = ["startMonth"], startMonth: string | null = "2026-11") =>
    fakeDb([], [], { opened: null, people, setup: { startMonth, doneSteps } });
  const firstVersion = (startsFromMonth = "2026-11", doneSteps = ["startMonth", "rentAndRooms"]) =>
    fakeDb([version(startsFromMonth, OWNER_ONLY)], [], { opened: null, people: [ALEX], setup: { startMonth: startsFromMonth, doneSteps } });
  const configOf = (row: VersionRow | undefined) => row?.config as HouseholdConfig;
  const splitsOf = (config: HouseholdConfig) =>
    [config.categories.rent, config.categories.utilities, config.categories.aircon].map((c) => [c.ownerBps, c.primaryBps]);
  const idOf = (row: VersionRow | undefined, role: "PRIMARY" | "TENANT") =>
    configOf(row).people.find((p) => p.role === role)?.personId ?? "";

  describe("before Rent & rooms is saved", () => {
    it("keeps Save disabled with no errors while required fields are blank", async () => {
      const blank = firstHome({
        landlordRentCents: null,
        landlordDueDay: undefined,
        newRooms: [{ roomType: "MASTER", name: "", airconUnits: null }],
      });
      expect(await previewHouseholdEdit(fresh().db, blank)).toMatchObject({ canSave: false, errors: {}, groups: [], masterRent: null });
      await expect(saveHouseholdEdit(fresh().db, blank, "Alex")).rejects.toMatchObject({ status: 422, code: "invalid_edit" });
    });

    it("still shows a wrong typed value", async () => {
      const preview = await previewHouseholdEdit(fresh().db, firstHome({ landlordDueDay: 40 }));
      expect(preview).toMatchObject({ canSave: false, errors: { landlordDueDay: "Enter a day from 1 to 31." } });
    });

    it("previews a complete form with the master rent and no summary", async () => {
      expect(await previewHouseholdEdit(fresh().db, firstHome())).toMatchObject({
        canSave: true,
        errors: {},
        groups: [],
        masterRent: "$3,000.00",
      });
    });

    it("refuses a household with no master room", async () => {
      const preview = await previewHouseholdEdit(fresh().db, firstHome({ newRooms: [] }));
      expect(preview).toMatchObject({ canSave: false, errors: { form: "Exactly one master room is required" } });
    });

    it("creates the owner, colored Teal, and the first version starting the start month", async () => {
      const { db, state } = fresh();
      expect(await saveHouseholdEdit(db, firstHome(), "Alex")).toEqual({ savedFromMonth: "2026-11" });
      expect(state.people).toEqual([expect.objectContaining({ name: "Alex", color: "TEAL", isOwner: true, whatsappE164: null })]);
      expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11"]);
      const config = configOf(state.versions[0]);
      const [master] = config.rooms;
      expect(master).toMatchObject({ roomType: "MASTER", name: "Master room", airconUnits: 1 });
      expect(config.people).toEqual([expect.objectContaining({ personId: state.people[0].id, role: "OWNER", roomId: master.id })]);
      expect(config.categories.utilities.totalShares).toBe(1000);
      expect(splitsOf(config)).toEqual([
        [10000, 0],
        [10000, 0],
        [10000, 0],
      ]);
    });

    it("marks Rent & rooms done with the first save", async () => {
      const { db, state } = fresh();
      await saveHouseholdEdit(db, firstHome(), "Alex");
      expect(state.setup.doneSteps).toEqual(["startMonth", "rentAndRooms"]);
    });

    it("starts the first version from a saved later start month", async () => {
      const { db, state } = fresh([], ["startMonth"], "2027-01");
      expect(await saveHouseholdEdit(db, firstHome(), "Alex")).toEqual({ savedFromMonth: "2027-01" });
      expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2027-01"]);
    });

    it("answers 409 start_month_first to Rent & rooms before Start month is saved", async () => {
      const refused = { status: 409, code: "start_month_first", message: "Choose the start month first." };
      await expect(previewHouseholdEdit(fresh([], [], null).db, firstHome())).rejects.toMatchObject(refused);
      await expect(saveHouseholdEdit(fresh([], [], null).db, firstHome(), "Alex")).rejects.toMatchObject(refused);
    });

    it("reuses an owner row that already exists", async () => {
      const { db, state } = fresh([ALEX]);
      await saveHouseholdEdit(db, firstHome(), "Someone else");
      expect(state.people).toEqual([ALEX]);
      expect(configOf(state.versions[0]).people[0].personId).toBe(PERSON_IDS.alex);
    });

    it.each<[string, HouseholdEdit]>([
      ["person", edit({ personId: PERSON_IDS.alex, name: "Al" })],
      ["addPerson", addPrimary],
      ["removePerson", { kind: "removePerson", personId: PERSON_IDS.alex }],
      ["split", { kind: "split", tenantShares: [], totalShares: 2000 }],
      ["recurring", { kind: "recurring", chargeId: null, label: "Parking", amountCents: 1000, personId: PERSON_IDS.alex, endMonth: null }],
    ])("answers 409 rooms_first to a %s edit", async (_kind, sent) => {
      const refused = { status: 409, code: "rooms_first", message: "Save Rent & rooms first." };
      await expect(previewHouseholdEdit(fresh([ALEX]).db, sent)).rejects.toMatchObject(refused);
      await expect(saveHouseholdEdit(fresh([ALEX]).db, sent)).rejects.toMatchObject(refused);
    });
  });

  describe("after Rent & rooms is saved", () => {
    it("updates the first version in place, starting the start month", async () => {
      const { db, state } = firstVersion();
      expect(await saveHouseholdEdit(db, homeEdit({ landlordRentCents: 310000 }))).toEqual({ savedFromMonth: "2026-11" });
      expect(state.versions).toHaveLength(1);
      expect(configOf(state.versions[0]).categories.rent.landlordRentCents).toBe(310000);
    });

    it("moves a version saved in an earlier month to the start month", async () => {
      const { db, state } = firstVersion("2026-10");
      await saveHouseholdEdit(db, homeEdit({ landlordDueDay: 2 }));
      expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11"]);
    });

    it("keeps Rent & rooms done when it is saved again", async () => {
      const { db, state } = firstVersion();
      await saveHouseholdEdit(db, homeEdit({ landlordRentCents: 310000 }));
      expect(state.setup.doneSteps).toEqual(["startMonth", "rentAndRooms"]);
    });

    it("answers 409 people_first to a Household split edit before People is done", async () => {
      const refused = { status: 409, code: "people_first", message: "Save people first." };
      const sent: HouseholdEdit = { kind: "split", tenantShares: [], rentPrimaryBps: 4000 };
      await expect(previewHouseholdEdit(firstVersion().db, sent)).rejects.toMatchObject(refused);
      await expect(saveHouseholdEdit(firstVersion().db, sent)).rejects.toMatchObject(refused);
    });

    it("saves a Household split once People is done and marks Household splits done", async () => {
      const { db, state } = firstVersion("2026-11", ["startMonth", "rentAndRooms", "people"]);
      await saveHouseholdEdit(db, addPrimary);
      expect(await saveHouseholdEdit(db, { kind: "split", tenantShares: [], rentPrimaryBps: 4000 })).toEqual({ savedFromMonth: "2026-11" });
      expect(configOf(state.versions[0]).categories.rent).toMatchObject({ ownerBps: 6000, primaryBps: 4000 });
      expect(state.setup.doneSteps).toEqual(["startMonth", "rentAndRooms", "people", "householdSplits"]);
    });

    it("shows a summary, since there are saved values to compare with", async () => {
      const preview = await previewHouseholdEdit(firstVersion().db, homeEdit({ landlordRentCents: 310000 }));
      expect(preview.groups[0]?.title).toBe("Saves from Nov 2026");
    });

    it("refuses a second master room", async () => {
      const preview = await previewHouseholdEdit(
        firstVersion().db,
        homeEdit({ newRooms: [{ roomType: "MASTER", name: "Big room", airconUnits: 1 }] }),
      );
      expect(preview).toMatchObject({ canSave: false, errors: { form: "The household already has a master room." } });
    });

    it("adds someone picking the master room as the primary tenant, with the splits at 50/50", async () => {
      const { db, state } = firstVersion();
      expect(await previewHouseholdEdit(db, addPrimary)).toEqual({ groups: [], canSave: true, errors: {} });
      expect(await saveHouseholdEdit(db, addPrimary)).toEqual({ savedFromMonth: "2026-11" });
      expect(state.versions).toHaveLength(1);
      const config = configOf(state.versions[0]);
      const primary = config.people.find((p) => p.role === "PRIMARY");
      expect(primary).toMatchObject({ roomId: ROOM_IDS.master, utilityShares: 0, dueDays: { RENT: 7, UTILITIES: 7, AIRCON: 7 } });
      expect(state.people.find((p) => p.id === primary?.personId)).toMatchObject({ name: "Priya", isOwner: false });
      expect(splitsOf(config)).toEqual([
        [5000, 5000],
        [5000, 5000],
        [5000, 5000],
      ]);
    });

    it("refuses shares or a route for the primary tenant", async () => {
      const preview = await previewHouseholdEdit(firstVersion().db, { ...addPrimary, utilityShares: 1000, rentViaPersonId: PERSON_IDS.alex });
      expect(preview).toMatchObject({
        canSave: false,
        errors: { utilityShares: "This comes from the split.", rentViaPersonId: "Only tenants can pay via someone." },
      });
    });

    it("refuses the master room once there is a primary tenant", async () => {
      const { db } = firstVersion();
      await saveHouseholdEdit(db, addPrimary);
      const preview = await previewHouseholdEdit(db, { ...addPrimary, name: "Casey" });
      expect(preview).toMatchObject({ canSave: false, errors: { roomId: "Choose an empty room." } });
    });

    it("refuses the master room once a month is open", async () => {
      const { db } = fakeDb([version("2026-11", OWNER_ONLY)], [], { people: [ALEX] });
      const preview = await previewHouseholdEdit(db, addPrimary);
      expect(preview).toMatchObject({ canSave: false, errors: { roomId: "Choose an empty room." } });
    });

    it("removes the primary tenant, putting the splits back to the owner, and deletes their row", async () => {
      const { db, state } = firstVersion();
      await saveHouseholdEdit(db, addPrimary);
      const primaryId = idOf(state.versions[0], "PRIMARY");
      expect(await saveHouseholdEdit(db, { kind: "removePerson", personId: primaryId })).toEqual({ savedFromMonth: "2026-11" });
      const config = configOf(state.versions[0]);
      expect(config.people.map((p) => p.role)).toEqual(["OWNER"]);
      expect(splitsOf(config)).toEqual([
        [10000, 0],
        [10000, 0],
        [10000, 0],
      ]);
      expect(state.people).toEqual([ALEX]);
    });

    it("removes a tenant and deletes their row", async () => {
      const { db, state } = firstVersion();
      await saveHouseholdEdit(db, addTenant);
      await saveHouseholdEdit(db, { kind: "removePerson", personId: idOf(state.versions[0], "TENANT") });
      expect(configOf(state.versions[0]).people).toHaveLength(1);
      expect(configOf(state.versions[0]).categories.utilities.totalShares).toBe(1000);
      expect(state.people).toEqual([ALEX]);
    });

    it("never removes the owner", async () => {
      const preview = await previewHouseholdEdit(firstVersion().db, { kind: "removePerson", personId: PERSON_IDS.alex });
      expect(preview).toMatchObject({ canSave: false, errors: { form: "Only tenants can be removed." } });
    });

    it("still refuses removing someone others pay via", async () => {
      const { db, state } = firstVersion();
      await saveHouseholdEdit(db, addPrimary);
      const primaryId = idOf(state.versions[0], "PRIMARY");
      await saveHouseholdEdit(db, { ...addTenant, utilitiesViaPersonId: primaryId, utilitiesDueDay: null });
      const preview = await previewHouseholdEdit(db, { kind: "removePerson", personId: primaryId });
      expect(preview.canSave).toBe(false);
      await expect(saveHouseholdEdit(db, { kind: "removePerson", personId: primaryId })).rejects.toMatchObject({ status: 422 });
      expect(state.people).toHaveLength(3);
    });
  });
});
