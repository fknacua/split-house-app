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

const VERSIONS = [version("2026-12", JAN_2027_CONFIG), version("2026-11", NOV_2026_CONFIG)];
const jordan = `?personId=${PERSON_IDS.jordan}`;

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold(VERSIONS);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/household/form", () => {
  it("shows the latest saved values with a note, parsing with the shared schema", async () => {
    const response = await GET(request(jordan), undefined);
    expect(response.status).toBe(200);
    const body = householdFormResponseSchema.parse(await response.json());
    expect(body.room[1]).toEqual({ label: "Rent (SGD)", value: "$1,000.00" });
    expect(body.datedTitle).toBe("From December 2026");
    expect(body.pendingNote).toBe("These take effect from December 2026.");
  });

  it("has no note when the saved values are already in effect", async () => {
    useHousehold([version("2026-11", NOV_2026_CONFIG)]);
    const body = householdFormResponseSchema.parse(await (await GET(request(jordan), undefined)).json());
    expect(body.room[1]).toEqual({ label: "Rent (SGD)", value: "$950.00" });
    expect(body.pendingNote).toBeNull();
  });

  it("compares with the version the active month is pinned to", async () => {
    useHousehold([version("2026-11", NOV_2026_CONFIG)], { "2026-11": JAN_2027_CONFIG });
    const body = householdFormResponseSchema.parse(await (await GET(request(jordan), undefined)).json());
    expect(body.pendingNote).toBe("These take effect from December 2026.");
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

  it("answers 404 no_version when no version covers next month", async () => {
    useHousehold([version("2027-06", NOV_2026_CONFIG)]);
    const response = await GET(request(jordan), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_version");
  });

  it("answers 409 rooms_first in First run before Rent & rooms is saved", async () => {
    useHousehold([]);
    Object.assign(prisma.month, { findFirst: async () => null });
    const response = await GET(request(jordan), undefined);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("rooms_first");
  });
});
