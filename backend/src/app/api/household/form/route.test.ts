import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, householdFormResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = (query: string) => new Request(`http://localhost/api/household/form${query}`);
const version = (startsFromMonth: string, config: unknown) => ({
  startsFromMonth,
  schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
  config,
});

/** Points the mocked Prisma client at a household with the given versions. */
function useHousehold(versions: ReturnType<typeof version>[], pinned: Record<string, unknown> = {}) {
  Object.assign(prisma, {
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async ({ where }: { where: { month: string } }) =>
        pinned[where.month]
          ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: pinned[where.month] } }
          : null,
    },
    householdVersion: { findMany: async () => versions },
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

const VERSIONS = [version("2027-01", JAN_2027_CONFIG), version("2026-11", NOV_2026_CONFIG)];
const jordan = `?personId=${PERSON_IDS.jordan}`;

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold(VERSIONS);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/household/form", () => {
  it("defaults to the first Starts from option, parsing with the shared schema", async () => {
    const response = await GET(request(jordan), undefined);
    expect(response.status).toBe(200);
    const body = householdFormResponseSchema.parse(await response.json());
    expect(body.month).toBe("2026-12");
    expect(body.startsFrom).toBe("2026-12");
    expect(body.values.amounts?.rentCents).toBe(95000);
  });

  it("reads the values of the version for the month asked for", async () => {
    const response = await GET(request(`${jordan}&month=2027-01`), undefined);
    const body = householdFormResponseSchema.parse(await response.json());
    expect(body.values.amounts?.rentCents).toBe(100000);
  });

  it("reads the version an opened month is pinned to", async () => {
    useHousehold(VERSIONS, { "2026-11": JAN_2027_CONFIG });
    const response = await GET(request(`${jordan}&month=2026-11`), undefined);
    expect(householdFormResponseSchema.parse(await response.json()).values.amounts?.rentCents).toBe(100000);
  });

  it("answers 400 without a person", async () => {
    expect((await GET(request(""), undefined)).status).toBe(400);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(request(jordan), undefined)).status).toBe(401);
  });

  it("answers 404 no_person for an unknown person", async () => {
    const response = await GET(request("?personId=nobody"), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_person");
  });

  it("answers 404 no_version for a month before every version", async () => {
    const response = await GET(request(`${jordan}&month=2026-10`), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_version");
  });

  it("answers 409 no_household before first run", async () => {
    useHousehold([]);
    expect((await GET(request(jordan), undefined)).status).toBe(409);
  });
});
