import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  HOUSEHOLD_SCHEMA_VERSION,
  apiErrorBodySchema,
  householdEditPreviewResponseSchema,
  householdEditSaveResponseSchema,
  type HouseholdConfig,
  type PersonColor,
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { roomOf, sharedAirconUnits, totalAirconUnits } from "@/lib/household/room-amounts";
import { prisma } from "@/lib/prisma";
import { buildMonthCharges, splitShareCategory } from "@/lib/split/engine";
import { POST as PREVIEW } from "./preview/route";
import { POST as SAVE } from "./route";

const request = (body: unknown) =>
  new Request("http://localhost/api/household/edits", { method: "POST", body: JSON.stringify(body) });

const EDIT = {
  kind: "person",
  personId: PERSON_IDS.jordan,
  name: "Jo",
  rentDueDay: 9,
};

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  const tx = {
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: {
      findMany: async () => [
        { id: "v1", startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      ],
      create: async () => ({}),
      updateMany: async () => ({ count: 1 }),
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
        { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
      ],
      update: async () => ({}),
    },
  };
  Object.assign(prisma, { ...tx, $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/household/edits/preview", () => {
  it("returns the summary, parsing with the shared schema", async () => {
    const response = await PREVIEW(request(EDIT), undefined);
    expect(response.status).toBe(200);
    const body = householdEditPreviewResponseSchema.parse(await response.json());
    expect(body.groups.map((g) => g.title)).toEqual(["Saves now", "Saves from Dec 2026"]);
    expect(body.canSave).toBe(true);
  });

  it("returns a home edit's summary, master rent and warnings, parsing with the shared schema", async () => {
    const home = { kind: "home", rooms: [{ id: ROOM_IDS.room2, rentCents: 0 }], newRooms: [], removedRoomIds: [] };
    const response = await PREVIEW(request(home), undefined);
    expect(response.status).toBe(200);
    const body = householdEditPreviewResponseSchema.parse(await response.json());
    expect(body.groups.map((g) => g.title)).toEqual(["Saves from Dec 2026"]);
    expect(body.masterRent).toBe("$4,300.00");
    expect(body.warnings).toEqual({ [`rooms.${ROOM_IDS.room2}.rentCents`]: "Room 2 rent is 0" });
    expect(body.canSave).toBe(true);
  });

  it("returns a split edit's summary, amounts and warnings, parsing with the shared schema", async () => {
    const split = { kind: "split", tenantShares: [{ personId: PERSON_IDS.jordan, utilityShares: 0 }] };
    const response = await PREVIEW(request(split), undefined);
    expect(response.status).toBe(200);
    const body = householdEditPreviewResponseSchema.parse(await response.json());
    expect(body.groups.map((g) => g.title)).toEqual(["Saves from Dec 2026"]);
    expect(body.amounts?.utilities.left).toBe("4");
    expect(body.warnings).toEqual({ [`tenantShares.${PERSON_IDS.jordan}`]: "Jordan utilities is 0" });
    expect(body.canSave).toBe(true);
  });

  it("answers a rule failure with 200 and the field's error", async () => {
    const response = await PREVIEW(request({ ...EDIT, depositCents: -1 }), undefined);
    expect(response.status).toBe(200);
    expect(householdEditPreviewResponseSchema.parse(await response.json()).errors.depositCents).toBeTruthy();
  });

  it("answers 400 for a bad body", async () => {
    expect((await PREVIEW(request({ kind: "nope" }), undefined)).status).toBe(400);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await PREVIEW(request(EDIT), undefined)).status).toBe(401);
  });
});

describe("POST /api/household/edits", () => {
  it("saves, parsing with the shared schema", async () => {
    const response = await SAVE(request(EDIT), undefined);
    expect(response.status).toBe(200);
    expect(householdEditSaveResponseSchema.parse(await response.json()).savedFromMonth).toBe("2026-12");
  });

  it.each([
    ["a broken rule", { ...EDIT, depositCents: -1 }, 422, "invalid_edit"],
    ["nothing to store", { ...EDIT, name: "Jordan", rentDueDay: 1 }, 422, "no_changes"],
    ["a route via themselves", { ...EDIT, rentViaPersonId: PERSON_IDS.jordan }, 422, "invalid_edit"],
    ["an empty route person", { ...EDIT, rentViaPersonId: "" }, 400, "invalid_request"],
  ])("answers %s with the standard error", async (_name, body, status, code) => {
    const response = await SAVE(request(body), undefined);
    expect(response.status).toBe(status);
    expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(code);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await SAVE(request(EDIT), undefined)).status).toBe(401);
  });
});

const ADD_CASEY = {
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

/** The config with an empty Room 4, in the landlord rent, for a new tenant. */
const withRoom4 = (config: HouseholdConfig): HouseholdConfig => ({
  ...config,
  rooms: [...config.rooms, { id: "room-4", roomType: "TENANT", name: "Room 4", airconUnits: 1, rentCents: 90000, includeInTotal: true }],
});

/** An in-memory household the routes save into. Returns its versions, which grow as edits are saved. */
function household(config: HouseholdConfig, newestOpened = "2026-11") {
  const versions: { id: string; startsFromMonth: string; schemaVersion: number; config: HouseholdConfig }[] = [
    { id: "v1", startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config },
  ];
  const people: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[] = [
    { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
    { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
    { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
    { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
  ];
  const tx = {
    month: { findFirst: async () => ({ month: newestOpened }) },
    householdVersion: {
      findMany: async () => versions,
      create: async ({ data }: { data: { startsFromMonth: string; schemaVersion: number; config: HouseholdConfig } }) => {
        versions.push({ id: `version-${data.startsFromMonth}`, ...data });
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: { schemaVersion: number; config: HouseholdConfig } }) => {
        Object.assign(versions.find((v) => v.id === where.id) ?? {}, data);
        return { count: 1 };
      },
    },
    person: {
      findMany: async () => people,
      update: async () => ({}),
      create: async ({ data }: { data: (typeof people)[number] }) => {
        people.push(data);
      },
    },
  };
  Object.assign(prisma, { ...tx, $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) });
  return versions;
}

describe("the month a saved version starts from", () => {
  const edits: [string, unknown][] = [
    ["person", EDIT],
    ["addPerson", ADD_CASEY],
    ["removePerson", { kind: "removePerson", personId: PERSON_IDS.jordan }],
    ["home", { kind: "home", rooms: [{ id: ROOM_IDS.room2, rentCents: 0 }], newRooms: [], removedRoomIds: [] }],
    ["split", { kind: "split", tenantShares: [{ personId: PERSON_IDS.jordan, utilityShares: 0 }] }],
    ["recurring", { kind: "recurring", chargeId: null, label: "Parking", amountCents: 1000, personId: PERSON_IDS.jordan, endMonth: null }],
    ["removeRecurring", { kind: "removeRecurring", chargeId: "recurring-starhub" }],
  ];
  // The clock reads November 2026: a month before it, the month itself, and one started early.
  const cases = [
    { opened: "2026-09", startsFrom: "2026-12" },
    { opened: "2026-11", startsFrom: "2026-12" },
    { opened: "2027-01", startsFrom: "2027-02" },
  ].flatMap(({ opened, startsFrom }) => edits.map(([kind, edit]) => ({ kind, edit, opened, startsFrom })));

  it.each(cases)("a $kind edit with $opened opened starts from $startsFrom", async ({ edit, opened, startsFrom }) => {
    const versions = household(withRoom4(NOV_2026_CONFIG), opened);
    const response = await SAVE(request(edit), undefined);
    expect(response.status).toBe(200);
    expect(householdEditSaveResponseSchema.parse(await response.json()).savedFromMonth).toBe(startsFrom);
    expect(versions.map((v) => v.startsFromMonth)).toEqual(["2026-11", startsFrom]);
    expect(startsFrom > opened).toBe(true);
  });
});

describe("rent and aircon after adding and removing a tenant", () => {
  const AIRCON_BILL_CENTS = 11000;

  const rentOf = (config: HouseholdConfig) =>
    Object.fromEntries(
      buildMonthCharges(config, "2026-12")
        .filter((charge) => charge.category === "RENT")
        .map((charge) => [charge.personId, charge.amountCents]),
    );

  // Aircon charges aren't built until Add charge, so this runs the saved units through the engine's split.
  const airconOf = (config: HouseholdConfig) =>
    splitShareCategory(
      AIRCON_BILL_CENTS,
      totalAirconUnits(config),
      config.people
        .filter((p) => p.role === "TENANT")
        .map((p) => ({ personId: p.personId, units: roomOf(config, p.personId).airconUnits })),
      { ownerPersonId: PERSON_IDS.alex, primaryPersonId: PERSON_IDS.priya, primaryBps: config.categories.aircon.primaryBps },
    );

  const save = async (edit: unknown) => expect((await SAVE(request(edit), undefined)).status).toBe(200);
  const remove = (personId: string) => save({ kind: "removePerson", personId });
  const inDecember = (versions: ReturnType<typeof household>) => versions[1].config;
  const inRoom = (config: HouseholdConfig, roomId: string) => config.people.find((p) => p.roomId === roomId)?.personId ?? "";

  it("starts from the fixtures", () => {
    expect(rentOf(NOV_2026_CONFIG)).toEqual({
      [PERSON_IDS.sam]: 95000,
      [PERSON_IDS.jordan]: 95000,
      [PERSON_IDS.alex]: 167500,
      [PERSON_IDS.priya]: 167500,
    });
    expect(airconOf(NOV_2026_CONFIG)).toEqual({
      [PERSON_IDS.sam]: 1833,
      [PERSON_IDS.jordan]: 1833,
      [PERSON_IDS.alex]: 3667,
      [PERSON_IDS.priya]: 3667,
    });
  });

  it("removing a tenant outside the landlord rent leaves the shared rent, and hands over their aircon", async () => {
    const versions = household(NOV_2026_CONFIG);
    await remove(PERSON_IDS.jordan);
    const config = inDecember(versions);
    expect(rentOf(config)).toEqual({ [PERSON_IDS.sam]: 95000, [PERSON_IDS.alex]: 167500, [PERSON_IDS.priya]: 167500 });
    expect(sharedAirconUnits(config)).toBe(5);
    expect(totalAirconUnits(config)).toBe(6);
    expect(airconOf(config)).toEqual({ [PERSON_IDS.sam]: 1833, [PERSON_IDS.alex]: 4583, [PERSON_IDS.priya]: 4584 });
  });

  it("removing a tenant in the landlord rent moves their rent and aircon to the owner and primary tenant", async () => {
    const versions = household(NOV_2026_CONFIG);
    await remove(PERSON_IDS.sam);
    const config = inDecember(versions);
    expect(rentOf(config)).toEqual({ [PERSON_IDS.jordan]: 95000, [PERSON_IDS.alex]: 215000, [PERSON_IDS.priya]: 215000 });
    expect(sharedAirconUnits(config)).toBe(5);
    expect(airconOf(config)).toEqual({ [PERSON_IDS.jordan]: 1833, [PERSON_IDS.alex]: 4583, [PERSON_IDS.priya]: 4584 });
  });

  it("adding a tenant to an empty room takes their rent and aircon from the owner and primary tenant", async () => {
    const versions = household(withRoom4(NOV_2026_CONFIG));
    await save(ADD_CASEY);
    const config = inDecember(versions);
    const casey = inRoom(config, "room-4");
    expect(rentOf(config)).toEqual({
      [PERSON_IDS.sam]: 95000,
      [PERSON_IDS.jordan]: 95000,
      [casey]: 90000,
      [PERSON_IDS.alex]: 122500,
      [PERSON_IDS.priya]: 122500,
    });
    expect(sharedAirconUnits(config)).toBe(4);
    expect(totalAirconUnits(config)).toBe(7);
    expect(airconOf(config)).toEqual({
      [PERSON_IDS.sam]: 1571,
      [PERSON_IDS.jordan]: 1571,
      [casey]: 1571,
      [PERSON_IDS.alex]: 3143,
      [PERSON_IDS.priya]: 3144,
    });
  });

  it("a new tenant in a removed tenant's room brings the amounts back", async () => {
    const versions = household(NOV_2026_CONFIG);
    await remove(PERSON_IDS.sam);
    await save({ ...ADD_CASEY, roomId: ROOM_IDS.room2 });
    expect(versions).toHaveLength(2);
    const config = inDecember(versions);
    const casey = inRoom(config, ROOM_IDS.room2);
    expect(rentOf(config)).toEqual({
      [PERSON_IDS.jordan]: 95000,
      [casey]: 95000,
      [PERSON_IDS.alex]: 167500,
      [PERSON_IDS.priya]: 167500,
    });
    expect(airconOf(config)).toEqual({
      [PERSON_IDS.jordan]: 1833,
      [casey]: 1833,
      [PERSON_IDS.alex]: 3667,
      [PERSON_IDS.priya]: 3667,
    });
  });

  it("leaves the opened month's version as it was", async () => {
    const versions = household(NOV_2026_CONFIG);
    await remove(PERSON_IDS.sam);
    expect(versions[0].config).toEqual(NOV_2026_CONFIG);
  });
});
