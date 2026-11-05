import {
  HOUSEHOLD_SCHEMA_VERSION,
  type HouseholdAddPersonEdit,
  type HouseholdConfig,
  type HouseholdHomeEdit,
  type HouseholdPersonEdit,
  type PersonColor,
} from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { masterRentCents, tenantRentCents } from "@/lib/household/room-amounts";
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

/** An in-memory household. `lockedIds` are versions a month has opened using. */
function fakeDb(versions: VersionRow[] = [version("2026-11", NOV_2026_CONFIG)], lockedIds: string[] = []) {
  const state = {
    versions: [...versions],
    people: [
      { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
      { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6590000001", color: "BLUE", isOwner: false },
      { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
      { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6590000003", color: "GREEN", isOwner: false },
    ] as PersonRow[],
  };
  const tx: HouseholdEditTx = {
    month: { findFirst: async () => ({ month: "2026-11" }) },
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
      edit({ name: "Jo", color: "PURPLE", rentCents: 100000, depositCents: 95000 }),
    );
    expect(preview.groups).toEqual([
      {
        title: "Saves now",
        rows: [
          { label: "Name", from: "Jordan", to: "Jo" },
          { label: "Color", from: "Green", to: "Purple" },
        ],
      },
      { title: "Saves from Dec 2026", rows: [{ label: "Rent", from: "$950.00", to: "$1,000.00" }] },
    ]);
    expect(preview.canSave).toBe(true);
    expect(preview.errors).toEqual({});
    expect(state.versions).toHaveLength(1);
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.name).toBe("Jordan");
  });

  it("has no groups and no Save when nothing changed", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ name: "Jordan", color: "GREEN", rentCents: 95000, rentDueDay: 1, utilitiesDueDay: 4 }),
    );
    expect(preview).toEqual({ groups: [], canSave: false, errors: {} });
  });

  it("shows due days as text", async () => {
    const { groups } = await previewHouseholdEdit(fakeDb().db, edit({ utilitiesDueDay: 9 }));
    expect(groups[0].rows).toEqual([{ label: "Utilities due", from: "4th", to: "9th" }]);
  });

  it("ignores shares and units, which the split page edits", async () => {
    const fields = { utilityShares: 1500, airconUnits: 2 } as Partial<HouseholdPersonEdit>;
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
    ["a negative rent", { rentCents: -1 }, "rentCents"],
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

  it("does not let the primary tenant take fixed amounts", async () => {
    const preview = await previewHouseholdEdit(fakeDb().db, edit({ personId: PERSON_IDS.priya, rentCents: 100000 }));
    expect(preview.errors.rentCents).toBe("This comes from the split.");
  });

  it("lets a person paying via someone have no due day", async () => {
    const preview = await previewHouseholdEdit(
      fakeDb().db,
      edit({ personId: PERSON_IDS.sam, utilitiesDueDay: null, rentCents: 100000 }),
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
    expect(await saveHouseholdEdit(db, edit({ rentCents: 100000 }))).toEqual({ savedFromMonth: "2026-12" });
    expect(state.versions).toHaveLength(2);
    const created = state.versions.find((v) => v.startsFromMonth === "2026-12");
    expect(created?.schemaVersion).toBe(HOUSEHOLD_SCHEMA_VERSION);
    expect(tenantRentCents(created?.config as HouseholdConfig, PERSON_IDS.jordan)).toBe(100000);
    expect(tenantRentCents(state.versions[0].config as HouseholdConfig, PERSON_IDS.jordan)).toBe(95000);
  });

  it("refuses a rent that would take the master rent below zero", async () => {
    const { db, state } = fakeDb();
    await expect(saveHouseholdEdit(db, edit({ personId: PERSON_IDS.sam, rentCents: 430001 }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    expect(state.versions).toHaveLength(1);

    const preview = await previewHouseholdEdit(db, edit({ personId: PERSON_IDS.sam, rentCents: 430001 }));
    expect(preview.errors.form).toBe("Master room rent cannot be below zero");
    expect(preview.canSave).toBe(false);
  });

  it("takes a rent rise in the total off the master rent, and not one outside it", async () => {
    const inTotal = fakeDb();
    await saveHouseholdEdit(inTotal.db, edit({ personId: PERSON_IDS.sam, rentCents: 100000 }));
    expect(masterRentCents(inTotal.state.versions[1].config as HouseholdConfig)).toBe(330000);

    const outside = fakeDb();
    await saveHouseholdEdit(outside.db, edit({ rentCents: 100000 }));
    expect(masterRentCents(outside.state.versions[1].config as HouseholdConfig)).toBe(335000);
  });

  it("adds three edits for one month to one version", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, edit({ rentCents: 100000 }));
    await saveHouseholdEdit(db, edit({ rentDueDay: 9 }));
    await saveHouseholdEdit(db, edit({ depositCents: 100000 }));
    expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", "2026-12"]);
    expect(jordanIn(state.versions[1])).toMatchObject({
      dueDays: { RENT: 9 },
      depositCents: 100000,
    });
    expect(tenantRentCents(state.versions[1].config as HouseholdConfig, PERSON_IDS.jordan)).toBe(100000);
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
    await saveHouseholdEdit(db, edit({ name: "Jo", rentCents: 100000 }));
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
    await expect(saveHouseholdEdit(db, edit({ rentCents: 100000 }))).rejects.toMatchObject({
      status: 404,
      code: "no_version",
    });
  });

  it("answers 409 no_household before first run", async () => {
    await expect(saveHouseholdEdit(fakeDb([]).db, edit({ name: "Jo" }))).rejects.toMatchObject({
      status: 409,
      code: "no_household",
    });
  });

  it("answers 409 version_conflict when a second save creates the month first", async () => {
    const { db } = fakeDb();
    db.$transaction = async () => {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    };
    await expect(saveHouseholdEdit(db, edit({ rentCents: 100000 }))).rejects.toMatchObject({
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
    rentCents: 90000,
    utilityShares: 1000,
    airconUnits: 1,
    depositCents: 0,
    rentDueDay: 3,
    utilitiesDueDay: 5,
    rentViaPersonId: null,
    utilitiesViaPersonId: null,
  };
  const dec = (versions: VersionRow[]) => versions.find((v) => v.startsFromMonth === "2026-12");
  const inDec = (versions: VersionRow[]) => (dec(versions)?.config as HouseholdConfig).people;

  it("is refused until 9.17, storing nothing", async () => {
    const { db, state } = fakeDb();
    expect(await previewHouseholdEdit(db, add)).toEqual({
      groups: [],
      canSave: false,
      errors: { form: "Adding a subtenant is not available yet." },
    });
    await expect(saveHouseholdEdit(db, add)).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
      message: "Adding a subtenant is not available yet.",
    });
    expect(state.versions).toHaveLength(1);
    expect(state.people).toHaveLength(4);
  });

  // Skipped until 9.17, when a new tenant picks a room. Rewrite these there.
  it.skip("previews with no groups and stores nothing", async () => {
    const { db, state } = fakeDb();
    expect(await previewHouseholdEdit(db, add)).toEqual({ groups: [], canSave: true, errors: {} });
    expect(state.versions).toHaveLength(1);
    expect(state.people).toHaveLength(4);
  });

  it.skip("creates the row and next month's version, leaving this month's as it was", async () => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, add)).toEqual({ savedFromMonth: "2026-12" });
    const row = state.people[4];
    expect(row).toMatchObject({ name: "Casey", whatsappE164: null, color: "PURPLE", isOwner: false });
    expect(inDec(state.versions).at(-1)?.personId).toBe(row.id);
    expect((state.versions[0].config as HouseholdConfig).people).toEqual(NOV_2026_CONFIG.people);
  });

  it.skip("adds to the version already waiting for next month, so earlier edits stay", async () => {
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2026-12", JAN_2027_CONFIG)]);
    await saveHouseholdEdit(db, add);
    expect(state.versions).toHaveLength(2);
    expect(inDec(state.versions).slice(0, -1)).toEqual(JAN_2027_CONFIG.people);
  });

  it.skip("leaves no row behind when the version is locked", async () => {
    const { db, state } = fakeDb(
      [version("2026-11", NOV_2026_CONFIG), version("2026-12", JAN_2027_CONFIG)],
      ["version-2026-12"],
    );
    await expect(saveHouseholdEdit(db, add)).rejects.toMatchObject({ status: 409, code: "version_locked" });
    expect(state.people).toHaveLength(4);
  });

  it("refuses to save with a required field empty or a value wrong", async () => {
    const { db, state } = fakeDb();
    await expect(saveHouseholdEdit(db, { ...add, rentCents: null })).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    await expect(saveHouseholdEdit(db, { ...add, airconUnits: 9 })).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
    expect(state.people).toHaveLength(4);
    expect(state.versions).toHaveLength(1);
  });

  it("answers 409 no_household before first run", async () => {
    await expect(saveHouseholdEdit(fakeDb([]).db, add)).rejects.toMatchObject({ status: 409, code: "no_household" });
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
