import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { addChargePreviewSchema, addChargeResponseSchema, addChargeSheetSchema, HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { POST as PREVIEW } from "./preview/route";
import { GET, POST } from "./route";

const { alex, priya, sam, jordan } = PERSON_IDS;

/** Points the mocked Prisma client at November as the newest opened month, or at no month at all. */
function useNovember(open = true) {
  const keys: { key: string; endpoint: string; response: unknown }[] = [];
  let next = 0;
  const client = {
    month: {
      findFirst: async () =>
        open
          ? {
              month: "2026-11",
              householdVersionId: "version-nov",
              householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
            }
          : null,
    },
    person: {
      findMany: async () => [
        { id: alex, name: "Alex", color: "BLUE" },
        { id: priya, name: "Priya", color: "ORANGE" },
        { id: sam, name: "Sam", color: "GREEN" },
        { id: jordan, name: "Jordan", color: "PURPLE" },
      ],
    },
    messageTemplates: { findUnique: async () => null },
    idempotentRequest: {
      findUnique: async ({ where }: { where: { key: string } }) => keys.find((k) => k.key === where.key) ?? null,
      create: async ({ data }: { data: (typeof keys)[number] }) => keys.push(data),
    },
    chargeGroup: { create: async () => ({ id: `group-${++next}` }) },
    charge: { createManyAndReturn: async ({ data }: { data: unknown[] }) => data.map(() => ({ id: `charge-${++next}` })) },
  };
  Object.assign(prisma, { ...client, $transaction: async (fn: (tx: typeof client) => unknown) => fn(client) });
  return { keys };
}

const VALUES = {
  kind: "AIRCON",
  label: "",
  amountCents: 11000,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  shares: [],
  dueDate: "2026-12-05",
};

const save = (body: unknown) =>
  POST(new Request("http://localhost/api/add-charge", { method: "POST", body: JSON.stringify(body) }), undefined);
const get = () => GET(new Request("http://localhost/api/add-charge"), undefined);
const preview = (body: unknown) =>
  PREVIEW(new Request("http://localhost/api/add-charge/preview", { method: "POST", body: JSON.stringify(body) }), undefined);

async function errorOf(response: Response) {
  return { status: response.status, code: ((await response.json()) as { error: { code: string } }).error.code };
}

describe("GET /api/add-charge", () => {
  it("returns the sheet for the newest opened month, parsing with the shared schema", async () => {
    useNovember();
    const response = await get();
    expect(response.status).toBe(200);
    const sheet = addChargeSheetSchema.parse(await response.json());
    expect(sheet).toMatchObject({ month: "2026-11", subtitle: "Nov 2026" });
  });

  it("answers 404 no_month while no month has opened", async () => {
    useNovember(false);
    expect(await errorOf(await get())).toEqual({ status: 404, code: "no_month" });
  });
});

describe("POST /api/add-charge/preview", () => {
  it("returns the preview, parsing with the shared schema", async () => {
    useNovember();
    const response = await preview(VALUES);
    expect(response.status).toBe(200);
    const result = addChargePreviewSchema.parse(await response.json());
    expect(result.save).toEqual({ label: "Save $110.00", enabled: true });
    expect(result.preview?.rows).toHaveLength(4);
  });

  it("answers 404 no_month while no month has opened", async () => {
    useNovember(false);
    expect(await errorOf(await preview(VALUES))).toEqual({ status: 404, code: "no_month" });
  });

  it.each([
    ["an unknown kind", { ...VALUES, kind: "RENT" }],
    ["a fractional amount", { ...VALUES, amountCents: 10.5 }],
    ["a badly formed due date", { ...VALUES, dueDate: "5 Dec" }],
    ["a missing field", { ...VALUES, customAmounts: undefined }],
  ])("answers 400 for %s", async (_name, body) => {
    useNovember();
    expect(await errorOf(await preview(body))).toEqual({ status: 400, code: "invalid_request" });
  });
});

describe("POST /api/add-charge", () => {
  const BODY = { ...VALUES, idempotencyKey: "key-00000001" };

  it("saves the charge, answering with a response that parses with the shared schema", async () => {
    useNovember();
    const response = await save(BODY);
    expect(response.status).toBe(200);
    const result = addChargeResponseSchema.parse(await response.json());
    expect(result).toMatchObject({ month: "2026-11", chargeGroupId: "group-1" });
    expect(result.chargeIds).toHaveLength(4);
  });

  it("answers a repeated key with the first response", async () => {
    useNovember();
    const first = await (await save(BODY)).json();
    const again = await save({ ...BODY, amountCents: 500 });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(first);
  });

  it.each([
    ["no key", { ...VALUES }, 400, "invalid_request"],
    ["a short key", { ...BODY, idempotencyKey: "k" }, 400, "invalid_request"],
    ["a malformed amount", { ...BODY, amountCents: "110" }, 400, "invalid_request"],
    ["nothing picked", { ...BODY, kind: null }, 422, "no_kind"],
    ["no label", { ...BODY, kind: "ONE_OFF", label: " " }, 422, "no_label"],
    ["$0", { ...BODY, amountCents: 0 }, 422, "no_amount"],
    ["nobody picked for Personal", { ...BODY, kind: "ONE_OFF", label: "Key", scope: "PERSONAL" }, 422, "no_who"],
    ["no due date", { ...BODY, dueDate: null }, 422, "no_date"],
    [
      "Custom amounts that don't add up",
      { ...BODY, kind: "ONE_OFF", label: "Fridge repair", split: "CUSTOM", customAmounts: [{ personId: alex, amountCents: 1 }] },
      422,
      "split_mismatch",
    ],
    [
      "shares all at 0",
      { ...BODY, kind: "ONE_OFF", label: "Fridge repair", split: "PER_SHARE", shares: [{ personId: alex, shares: 0 }] },
      422,
      "no_shares",
    ],
    ["the owner for Personal", { ...BODY, kind: "ONE_OFF", label: "Key", scope: "PERSONAL", personId: alex }, 404, "no_person"],
  ])("answers %s with %i", async (_name, body, status, code) => {
    useNovember();
    expect(await errorOf(await save(body))).toEqual({ status, code });
  });

  it("answers 404 no_month while no month has opened", async () => {
    useNovember(false);
    expect(await errorOf(await save(BODY))).toEqual({ status: 404, code: "no_month" });
  });

  it("answers 409 key_reused for a key another endpoint stored", async () => {
    const { keys } = useNovember();
    keys.push({ key: BODY.idempotencyKey, endpoint: "POST /api/corrections", response: {} });
    expect(await errorOf(await save(BODY))).toEqual({ status: 409, code: "key_reused" });
  });
});
