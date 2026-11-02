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
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { POST as PREVIEW } from "./preview/route";
import { POST as SAVE } from "./route";

const request = (body: unknown) =>
  new Request("http://localhost/api/household/edits", { method: "POST", body: JSON.stringify(body) });

const EDIT = {
  kind: "person",
  personId: PERSON_IDS.jordan,
  startsFromMonth: "2027-01",
  name: "Jo",
  rentCents: 100000,
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
      findUnique: async () => ({
        id: PERSON_IDS.jordan,
        name: "Jordan",
        whatsappE164: null,
        color: "GREEN",
        isOwner: false,
      }),
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
    expect(body.groups.map((g) => g.title)).toEqual(["Saves now", "Saves from Jan 2027"]);
    expect(body.canSave).toBe(true);
  });

  it("answers a rule failure with 200 and the field's error", async () => {
    const response = await PREVIEW(request({ ...EDIT, rentCents: -1 }), undefined);
    expect(response.status).toBe(200);
    expect(householdEditPreviewResponseSchema.parse(await response.json()).errors.rentCents).toBeTruthy();
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
    expect(householdEditSaveResponseSchema.parse(await response.json()).savedFromMonth).toBe("2027-01");
  });

  it.each([
    ["a malformed month", { ...EDIT, startsFromMonth: "nope" }, 400, "invalid_request"],
    ["a month that has passed", { ...EDIT, startsFromMonth: "2026-11" }, 409, "month_locked"],
    ["a broken rule", { ...EDIT, rentCents: -1 }, 422, "invalid_edit"],
    ["nothing to store", { ...EDIT, name: "Jordan", rentCents: 95000 }, 422, "no_changes"],
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
