import {
  HOUSEHOLD_SCHEMA_VERSION,
  type HouseholdConfig,
  type HouseholdPersonEdit,
  type PersonColor,
} from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
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
      findUnique: async ({ where }) => state.people.find((p) => p.id === where.id) ?? null,
      update: async ({ where, data }) => {
        state.people = state.people.map((p) => (p.id === where.id ? { ...p, ...data } : p));
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
  startsFromMonth: "2027-01",
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
      edit({ name: "Jo", color: "PURPLE", rentCents: 100000, airconUnits: 1 }),
    );
    expect(preview.groups).toEqual([
      {
        title: "Saves now",
        rows: [
          { label: "Name", from: "Jordan", to: "Jo" },
          { label: "Color", from: "Green", to: "Purple" },
        ],
      },
      { title: "Saves from Jan 2027", rows: [{ label: "Jordan rent", from: "$950.00", to: "$1,000.00" }] },
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
    expect(preview).toEqual({ groups: [], canSave: false, errors: {}, laterVersionWarning: null });
  });

  it("shows shares and due days as text", async () => {
    const { groups } = await previewHouseholdEdit(fakeDb().db, edit({ utilityShares: 1500, utilitiesDueDay: 9 }));
    expect(groups[0].rows).toEqual([
      { label: "Jordan utility shares", from: "1", to: "1.5" },
      { label: "Jordan utilities due", from: "4th", to: "9th" },
    ]);
  });

  it("compares with the version before the chosen month, not the one being added to", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2027-01", JAN_2027_CONFIG)]);
    const preview = await previewHouseholdEdit(db, edit({ airconUnits: 2 }));
    expect(preview.groups[0].rows).toEqual([
      { label: "Jordan rent", from: "$950.00", to: "$1,000.00" },
      { label: "Jordan aircon units", from: "1", to: "2" },
    ]);
  });

  it("warns when a later version keeps its own values", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2027-03", JAN_2027_CONFIG)]);
    const preview = await previewHouseholdEdit(db, edit({ airconUnits: 2 }));
    expect(preview.laterVersionWarning).toBe("March 2027 keeps its own values, so this change stops there.");
  });

  it("does not warn when only the person's row changes", async () => {
    const { db } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2027-03", JAN_2027_CONFIG)]);
    expect((await previewHouseholdEdit(db, edit({ name: "Jo" }))).laterVersionWarning).toBeNull();
  });

  it.each([
    ["an empty name", { name: "  " }, "name"],
    ["a bad number", { whatsappE164: "12345" }, "whatsappE164"],
    ["Teal for a tenant", { color: "TEAL" as const }, "color"],
    ["a negative rent", { rentCents: -1 }, "rentCents"],
    ["a day out of range", { rentDueDay: 32 }, "rentDueDay"],
    ["a direct payer's due day cleared", { rentDueDay: null }, "rentDueDay"],
    ["more shares than the total", { utilityShares: 5001 }, "utilityShares"],
    ["more units than the total", { airconUnits: 7 }, "airconUnits"],
    ["a dated change on the active month", { rentCents: 100000, startsFromMonth: "2026-11" }, "startsFromMonth"],
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
});

describe("saveHouseholdEdit", () => {
  it("creates a version for a new month, from the version in effect", async () => {
    const { db, state } = fakeDb();
    expect(await saveHouseholdEdit(db, edit({ rentCents: 100000 }))).toEqual({ savedFromMonth: "2027-01" });
    expect(state.versions).toHaveLength(2);
    const created = state.versions.find((v) => v.startsFromMonth === "2027-01");
    expect(created?.schemaVersion).toBe(HOUSEHOLD_SCHEMA_VERSION);
    expect(jordanIn(created)?.rentCents).toBe(100000);
    expect(jordanIn(state.versions[0])?.rentCents).toBe(95000);
  });

  it("adds three edits for one month to one version", async () => {
    const { db, state } = fakeDb();
    await saveHouseholdEdit(db, edit({ rentCents: 100000 }));
    await saveHouseholdEdit(db, edit({ airconUnits: 2 }));
    await saveHouseholdEdit(db, edit({ depositCents: 100000 }));
    expect(state.versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", "2027-01"]);
    expect(jordanIn(state.versions[1])).toMatchObject({ rentCents: 100000, airconUnits: 2, depositCents: 100000 });
  });

  it("does not change a later version", async () => {
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), version("2027-03", JAN_2027_CONFIG)]);
    await saveHouseholdEdit(db, edit({ airconUnits: 2 }));
    const later = state.versions.find((v) => v.startsFromMonth === "2027-03");
    expect(jordanIn(later)?.airconUnits).toBe(1);
  });

  it("refuses to update a version a month has opened using, storing nothing", async () => {
    const jan = version("2027-01", JAN_2027_CONFIG);
    const { db, state } = fakeDb([version("2026-11", NOV_2026_CONFIG), jan], [jan.id]);
    await expect(saveHouseholdEdit(db, edit({ airconUnits: 2, name: "Jo" }))).rejects.toMatchObject({
      status: 409,
      code: "version_locked",
    });
    expect(jordanIn(state.versions[1])?.airconUnits).toBe(1);
    expect(state.people.find((p) => p.id === PERSON_IDS.jordan)?.name).toBe("Jordan");
  });

  it.each(["2026-10", "2026-11"])("answers 409 month_locked for a dated change from %s", async (startsFromMonth) => {
    await expect(saveHouseholdEdit(fakeDb().db, edit({ rentCents: 100000, startsFromMonth }))).rejects.toMatchObject({
      status: 409,
      code: "month_locked",
    });
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

  it("answers 422 invalid_edit when the config checks fail", async () => {
    await expect(saveHouseholdEdit(fakeDb().db, edit({ utilityShares: 5001 }))).rejects.toMatchObject({
      status: 422,
      code: "invalid_edit",
    });
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

  it("answers 404 no_person for someone not in the month's version", async () => {
    const config = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan) };
    await expect(saveHouseholdEdit(fakeDb([version("2026-11", config)]).db, edit({ name: "Jo" }))).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });

  it("answers 404 no_version for a month before every version", async () => {
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
