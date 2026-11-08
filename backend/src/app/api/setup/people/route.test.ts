import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, apiErrorBodySchema, setupPeopleResponseSchema, type HouseholdConfig } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

/** The first version after Rent & rooms: the owner alone. */
const OWNER_ONLY: HouseholdConfig = {
  rooms: [{ id: ROOM_IDS.master, roomType: "MASTER", name: "Master room", airconUnits: 1 }],
  people: [{ personId: PERSON_IDS.alex, role: "OWNER", roomId: ROOM_IDS.master, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 }],
  categories: {
    rent: { landlordRentCents: 300000, landlordDueDay: 1, ownerBps: 10000, primaryBps: 0 },
    utilities: { totalShares: 1000, ownerBps: 10000, primaryBps: 0 },
    aircon: { ownerBps: 10000, primaryBps: 0 },
  },
  recurring: [],
};

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
];

const request = () => new Request("http://localhost/api/setup/people");

/** Points the mocked Prisma client at First run with one version, or none, and the given done steps. */
function useFirstRun({
  config = NOV_2026_CONFIG,
  doneSteps = ["startMonth", "rentAndRooms"],
  opened = null,
}: { config?: HouseholdConfig | null; doneSteps?: string[]; opened?: string | null } = {}) {
  Object.assign(prisma, {
    month: { findFirst: async () => (opened ? { month: opened } : null), findUnique: async () => null },
    householdVersion: {
      findMany: async () => (config ? [{ startsFromMonth: "2026-12", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config }] : []),
    },
    setup: { findUnique: async () => ({ startMonth: "2026-12", doneSteps }) },
    person: { findMany: async () => PEOPLE },
  });
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-09T09:00:00+08:00");
  useFirstRun();
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/setup/people", () => {
  it("lists the primary tenant and the tenants, without the owner, parsing with the shared schema", async () => {
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = setupPeopleResponseSchema.parse(await response.json());
    expect(body).toMatchObject({ title: "People", sub: "Who pays you", heading: "People" });
    expect(body.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Jordan"]);
    expect(body.people[2].actions).toEqual([
      { label: "View", target: { kind: "view-person", personId: PERSON_IDS.jordan } },
      { label: "Edit", target: { kind: "edit-person", personId: PERSON_IDS.jordan } },
    ]);
    expect(body.empty).toBeNull();
    expect(body.addMore).toEqual({ label: "Add more", target: { kind: "add-person" } });
    expect(body.save).toEqual({ label: "Save people", enabled: true });
  });

  it("uses Household's facts on each card", async () => {
    const body = setupPeopleResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.people[2].facts).toEqual([
      { label: "Rent · due 1st", value: "$950.00" },
      { label: "Utilities · due 4th", value: "1 share" },
    ]);
  });

  it("shows the empty card and keeps Save disabled while only the owner is in", async () => {
    useFirstRun({ config: OWNER_ONLY });
    const body = setupPeopleResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.people).toEqual([]);
    expect(body.empty).toEqual({ text: "No people yet", add: { label: "Add person", target: { kind: "add-person" } } });
    expect(body.addMore).toBeNull();
    expect(body.save.enabled).toBe(false);
  });

  it.each([
    [["startMonth"], "rooms_first"],
    [[], "start_month_first"],
  ])("answers 409 out of order (done %j)", async (doneSteps, code) => {
    useFirstRun({ doneSteps });
    const response = await GET(request(), undefined);
    expect(response.status).toBe(409);
    expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(code);
  });

  it("answers 409 setup_done once a month is open", async () => {
    useFirstRun({ opened: "2026-12" });
    const response = await GET(request(), undefined);
    expect(response.status).toBe(409);
    expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe("setup_done");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in first."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });
});
