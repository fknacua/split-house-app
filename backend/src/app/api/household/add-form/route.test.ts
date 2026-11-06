import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, householdAddFormResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = () => new Request("http://localhost/api/household/add-form");
const VERSION = { startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

/** Points the mocked Prisma client at a household with the given versions. */
function useHousehold(versions: (typeof VERSION)[]) {
  Object.assign(prisma, {
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: { findMany: async () => versions },
    setup: { findUnique: async () => ({ startMonth: null, doneSteps: ["startMonth", "rentAndRooms", "people"] }) },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
        { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
        // Not in any version any more, so Pink is free again.
        { id: "person-gone", name: "Gone", whatsappE164: null, color: "PINK", isOwner: false },
      ],
    },
  });
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold([VERSION]);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/household/add-form", () => {
  it("returns the empty form's text, parsing with the shared schema", async () => {
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = householdAddFormResponseSchema.parse(await response.json());
    expect(body.title).toBe("Add subtenant");
    expect(body.sub).toBe("New person in the household");
    expect(body.datedTitle).toBe("From December 2026");
  });

  it("defaults to the first color nobody in the version uses, and never offers Teal", async () => {
    const body = householdAddFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.color).toBe("PURPLE");
    expect(body.colorName).toBe("Purple");
    expect(body.swatches.map((s) => s.color)).not.toContain("TEAL");
  });

  it("offers only people who pay directly, and never the owner", async () => {
    const body = householdAddFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.sentViaOptions).toEqual([
      { personId: PERSON_IDS.priya, name: "Priya" },
      { personId: PERSON_IDS.jordan, name: "Jordan" },
    ]);
  });

  it("lists no rooms when every tenant room is taken", async () => {
    const body = householdAddFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.rooms).toEqual([]);
  });

  it("lists only empty tenant rooms, with their rent and units", async () => {
    const config = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan),
    };
    useHousehold([{ ...VERSION, config }]);
    const body = householdAddFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.rooms).toEqual([
      {
        id: ROOM_IDS.room3,
        name: "Room 3",
        facts: [
          { label: "Rent (SGD)", value: "$950.00" },
          { label: "Aircon units", value: "1" },
        ],
      },
    ]);
  });

  it("answers 409 rooms_first in First run before Rent & rooms is saved", async () => {
    useHousehold([]);
    Object.assign(prisma.month, { findFirst: async () => null });
    const response = await GET(request(), undefined);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("rooms_first");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in first."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });
});
