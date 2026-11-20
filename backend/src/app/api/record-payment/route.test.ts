import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, recordPaymentResponseSchema, recordPaymentSheetSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { POST as PREVIEW } from "./preview/route";
import { GET, POST } from "./route";

const { alex, priya, jordan } = PERSON_IDS;

const JORDAN_RENT = {
  id: "jordan-rent",
  personId: jordan,
  month: "2026-11",
  category: "RENT",
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01T00:00:00+08:00"),
  payViaPersonId: null,
  paidCents: null as number | null,
  householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
};
const JORDAN_UTILITIES = { ...JORDAN_RENT, id: "jordan-utilities", category: "UTILITIES", label: "Utilities", amountCents: 8246, dueDate: new Date("2026-11-04T00:00:00+08:00") };
const PRIYA_RENT = { ...JORDAN_RENT, id: "priya-rent", personId: priya, amountCents: 167500, dueDate: new Date("2026-11-07T00:00:00+08:00") };

/** Points the mocked Prisma client at November, open or not, with Jordan's and Priya's charges unpaid. */
function useNovember(open = true) {
  const rows = [JORDAN_RENT, JORDAN_UTILITIES, PRIYA_RENT].map((r) => ({ ...r }));
  const people = [
    { id: alex, name: "Alex", isOwner: true },
    { id: priya, name: "Priya", isOwner: false },
    { id: jordan, name: "Jordan", isOwner: false },
  ];
  const client = {
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () => (open ? { month: "2026-11" } : null),
    },
    person: {
      findMany: async () => people,
      findUnique: async ({ where }: { where: { id: string } }) => people.find((p) => p.id === where.id) ?? null,
    },
    charge: {
      findMany: async ({ where }: { where: { id?: { in: string[] } } }) =>
        where.id ? rows.filter((r) => where.id?.in.includes(r.id)) : rows.filter((r) => r.paidCents === null),
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: { id: string }; data: { paidCents: number } }) => {
        const target = rows.find((r) => r.id === where.id && r.paidCents === null);
        if (target) target.paidCents = data.paidCents;
        return { count: target ? 1 : 0 };
      },
    },
  };
  Object.assign(prisma, { ...client, $transaction: async (fn: (tx: typeof client) => unknown) => fn(client) });
}

const get = (query: string) => GET(new Request(`http://localhost/api/record-payment?${query}`), undefined);
const postJson = (handler: typeof POST, path: string, body: unknown) =>
  handler(new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) }), undefined);
const save = (body: unknown) => postJson(POST, "/api/record-payment", body);
const preview = (body: unknown) => postJson(PREVIEW, "/api/record-payment/preview", body);

async function errorOf(response: Response) {
  return { status: response.status, code: ((await response.json()) as { error: { code: string } }).error.code };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/record-payment", () => {
  it("returns the sheet with Mark paid's charge ticked, parsing with the shared schema", async () => {
    useNovember();
    const response = await get("chargeId=jordan-rent");
    expect(response.status).toBe(200);
    const sheet = recordPaymentSheetSchema.parse(await response.json());
    expect(sheet.from.personId).toBe(jordan);
    expect(sheet.record).toEqual({ label: "Record $950.00", request: { personId: jordan, chargeIds: ["jordan-rent"] } });
  });

  it.each([
    ["an empty person id", "personId=", true, 400, "invalid_request"],
    ["a month that isn't open", "", false, 404, "no_month"],
    ["the owner", `personId=${alex}`, true, 404, "no_person"],
    ["an unknown charge", "chargeId=nope", true, 404, "no_charge"],
    ["someone else's charge", `personId=${jordan}&chargeId=priya-rent`, true, 409, "not_their_charge"],
  ])("refuses %s", async (_, query, open, status, code) => {
    useNovember(open);
    expect(await errorOf(await get(query))).toEqual({ status, code });
  });
});

describe("POST /api/record-payment/preview", () => {
  it("returns the sheet with the new ticks, parsing with the shared schema", async () => {
    useNovember();
    const response = await preview({ personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"] });
    expect(response.status).toBe(200);
    const sheet = recordPaymentSheetSchema.parse(await response.json());
    expect(sheet.amount.note).toBe("Multiple charges can only be paid in full");
    expect(sheet.confirm?.for.value).toBe("2 charges");
  });

  it.each([
    ["a body without chargeIds", { personId: jordan }, true, 400, "invalid_request"],
    ["a month that isn't open", { personId: jordan, chargeIds: [] }, false, 404, "no_month"],
    ["someone with nothing to pay", { personId: alex, chargeIds: [] }, true, 404, "no_person"],
  ])("refuses %s", async (_, body, open, status, code) => {
    useNovember(open);
    expect(await errorOf(await preview(body))).toEqual({ status, code });
  });
});

describe("POST /api/record-payment", () => {
  it("records the charges in full, parsing with the shared schema", async () => {
    useNovember();
    const response = await save({ personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"], paidOn: "2026-11-03" });
    expect(response.status).toBe(200);
    expect(recordPaymentResponseSchema.parse(await response.json())).toEqual({
      personId: jordan,
      chargeIds: ["jordan-rent", "jordan-utilities"],
      months: ["2026-11"],
    });
  });

  it.each([
    ["an empty charge list", { personId: jordan, chargeIds: [], paidOn: "2026-11-03" }, 400, "invalid_request"],
    ["a malformed day", { personId: jordan, chargeIds: ["jordan-rent"], paidOn: "3 Nov" }, 400, "invalid_request"],
    ["a day after today", { personId: jordan, chargeIds: ["jordan-rent"], paidOn: "2026-11-04" }, 400, "invalid_request"],
    ["a missing day", { personId: jordan, chargeIds: ["jordan-rent"] }, 422, "no_date"],
    ["the owner", { personId: alex, chargeIds: ["jordan-rent"], paidOn: "2026-11-03" }, 404, "no_person"],
    ["an unknown charge", { personId: jordan, chargeIds: ["nope"], paidOn: "2026-11-03" }, 404, "no_charge"],
    ["someone else's charge", { personId: jordan, chargeIds: ["priya-rent"], paidOn: "2026-11-03" }, 409, "not_their_charge"],
  ])("refuses %s", async (_, body, status, code) => {
    useNovember();
    expect(await errorOf(await save(body))).toEqual({ status, code });
  });

  it("refuses a charge that is already paid", async () => {
    useNovember();
    await save({ personId: jordan, chargeIds: ["jordan-rent"], paidOn: "2026-11-03" });
    expect(await errorOf(await save({ personId: jordan, chargeIds: ["jordan-rent"], paidOn: "2026-11-03" }))).toEqual({
      status: 409,
      code: "already_paid",
    });
  });
});
