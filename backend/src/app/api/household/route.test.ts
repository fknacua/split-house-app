import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, householdViewResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = (query = "") => new Request(`http://localhost/api/household${query}`);

/** Points the mocked Prisma client at a household with the given versions. */
function useHousehold(versions: { startsFromMonth: string; schemaVersion: number; config: unknown }[]) {
  Object.assign(prisma, {
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () => null,
    },
    householdVersion: { findMany: async () => versions },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null },
        { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6581234567" },
        { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null },
        { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6581234568" },
      ],
    },
  });
}

const NOVEMBER = { startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold([NOVEMBER]);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/household", () => {
  it("returns the active month, parsing with the shared schema", async () => {
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = householdViewResponseSchema.parse(await response.json());
    expect(body.month).toBe("2026-11");
    expect(body.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Jordan", "You"]);
  });

  it("returns the month asked for", async () => {
    const response = await GET(request("?month=2027-01"), undefined);
    expect(response.status).toBe(200);
    expect(householdViewResponseSchema.parse(await response.json()).month).toBe("2027-01");
  });

  it("answers 400 for a bad month", async () => {
    const response = await GET(request("?month=nope"), undefined);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });

  it("answers 404 no_version for a month before every version", async () => {
    const response = await GET(request("?month=2026-10"), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_version");
  });

  it("answers 409 no_household before first run", async () => {
    useHousehold([]);
    const response = await GET(request(), undefined);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("no_household");
  });
});
