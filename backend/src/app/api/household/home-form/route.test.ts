import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, apiErrorBodySchema, householdHomeFormResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = () => new Request("http://localhost/api/household/home-form");
const version = (startsFromMonth: string, config: unknown) => ({
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

/** Points the mocked Prisma client at a household with the given versions. */
function useHousehold(versions: ReturnType<typeof version>[]) {
  Object.assign(prisma, {
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () => null,
    },
    householdVersion: { findMany: async () => versions },
    setup: { findUnique: async () => ({ startMonth: null, doneSteps: ["startMonth", "rentAndRooms", "people"] }) },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
        { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
      ],
    },
  });
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold([version("2026-11", NOV_2026_CONFIG)]);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/household/home-form", () => {
  it("shows the saved values, parsing with the shared schema", async () => {
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = householdHomeFormResponseSchema.parse(await response.json());
    expect(body.values.landlordRentCents).toBe(430000);
    expect(body.datedTitle).toBe("From December 2026");
    expect(body.pendingNote).toBeNull();
    expect(body.rooms).toHaveLength(5);
  });

  it("reads next month's version, with the note", async () => {
    useHousehold([version("2026-12", JAN_2027_CONFIG), version("2026-11", NOV_2026_CONFIG)]);
    const body = householdHomeFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.pendingNote).toBe("These take effect from December 2026.");
  });

  it("shows a blank form with the master room to add in First run before any version exists", async () => {
    useHousehold([]);
    Object.assign(prisma.month, { findFirst: async () => null });
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = householdHomeFormResponseSchema.parse(await response.json());
    expect(body.datedTitle).toBe("From November 2026");
    expect(body.pendingNote).toBeNull();
    expect(body.values).toEqual({ landlordRentCents: null, landlordDueDay: null, billDueDay: null });
    expect(body.rooms).toEqual([]);
    expect(body.roomsToAdd).toEqual([
      expect.objectContaining({ roomType: "MASTER", name: "Master room", airconUnits: null, canRemove: false }),
    ]);
  });

  it("reads the first version in First run, with no room to add and nothing pending", async () => {
    useHousehold([version("2026-11", NOV_2026_CONFIG)]);
    Object.assign(prisma.month, { findFirst: async () => null });
    const body = householdHomeFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.rooms).toHaveLength(5);
    expect(body.roomsToAdd).toEqual([]);
    expect(body.pendingNote).toBeNull();
  });

  it("answers 409 start_month_first in First run before Start month is saved", async () => {
    useHousehold([]);
    Object.assign(prisma, {
      month: { findFirst: async () => null },
      setup: { findUnique: async () => null },
    });
    const response = await GET(request(), undefined);
    expect(response.status).toBe(409);
    expect(apiErrorBodySchema.parse(await response.json()).error).toEqual({
      code: "start_month_first",
      message: "Choose the start month first.",
    });
  });

  it("starts the blank form from a saved later start month", async () => {
    useHousehold([]);
    Object.assign(prisma, {
      month: { findFirst: async () => null },
      setup: { findUnique: async () => ({ startMonth: "2027-01", doneSteps: ["startMonth"] }) },
    });
    const body = householdHomeFormResponseSchema.parse(await (await GET(request(), undefined)).json());
    expect(body.datedTitle).toBe("From January 2027");
  });

  it("answers 404 no_version when a month is open but no version covers next month", async () => {
    useHousehold([]);
    const response = await GET(request(), undefined);
    expect(response.status).toBe(404);
    expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe("no_version");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });
});
