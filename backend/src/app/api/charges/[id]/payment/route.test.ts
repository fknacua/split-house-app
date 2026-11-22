import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { editPaymentResponseSchema, editPaymentSheetSchema } from "@splithouse/shared";
import { PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { DELETE, GET, PATCH } from "./route";

const { alex, priya, sam, jordan } = PERSON_IDS;

interface Row {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  label: string;
  amountCents: number;
  paidCents: number | null;
  paidOn: Date | null;
  paidByPersonId: string | null;
}

const ROWS: Row[] = [
  { id: "jordan-rent", month: "2026-11", personId: jordan, payViaPersonId: null, label: "Rent", amountCents: 95000, paidCents: 95000, paidOn: new Date("2026-11-03"), paidByPersonId: jordan },
  { id: "jordan-utilities", month: "2026-11", personId: jordan, payViaPersonId: null, label: "Utilities", amountCents: 8246, paidCents: null, paidOn: null, paidByPersonId: null },
  { id: "sam-utilities", month: "2026-10", personId: sam, payViaPersonId: priya, label: "Utilities", amountCents: 8246, paidCents: 8246, paidOn: new Date("2026-10-07"), paidByPersonId: priya },
  { id: "alex-rent", month: "2026-11", personId: alex, payViaPersonId: null, label: "Rent", amountCents: 167500, paidCents: null, paidOn: null, paidByPersonId: null },
  { id: "jordan-refund", month: "2026-11", personId: jordan, payViaPersonId: null, label: "Correction", amountCents: -500, paidCents: -500, paidOn: new Date("2026-11-02"), paidByPersonId: jordan },
];

let rows: Row[] = [];

/** Points the mocked Prisma client at a fresh copy of the rows. */
function useCharges() {
  rows = ROWS.map((r) => ({ ...r }));
  const people = [
    { id: alex, name: "Alex", isOwner: true },
    { id: priya, name: "Priya", isOwner: false },
    { id: sam, name: "Sam", isOwner: false },
    { id: jordan, name: "Jordan", isOwner: false },
  ];
  Object.assign(prisma, {
    person: { findMany: async () => people },
    charge: {
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const target = rows.find((r) => r.id === where.id)!;
        Object.assign(target, data);
        return { ...target };
      },
    },
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const url = (id: string) => `http://localhost/api/charges/${id}/payment`;
const get = (id: string) => GET(new Request(url(id)), params(id));
const patch = (id: string, body: unknown) =>
  PATCH(new Request(url(id), { method: "PATCH", body: typeof body === "string" ? body : JSON.stringify(body) }), params(id));
const remove = (id: string) => DELETE(new Request(url(id), { method: "DELETE" }), params(id));

async function errorOf(response: Response) {
  return { status: response.status, code: ((await response.json()) as { error: { code: string } }).error.code };
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-21T09:00:00+08:00");
  useCharges();
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/charges/:id/payment", () => {
  it("returns the sheet, parsing with the shared schema", async () => {
    const response = await get("jordan-rent");
    expect(response.status).toBe(200);
    const sheet = editPaymentSheetSchema.parse(await response.json());
    expect(sheet.rows.map((r) => r.value)).toEqual(["Jordan", "Rent · Nov 2026", "$950.00"]);
    expect(sheet.paidOn).toBe("2026-11-03");
  });

  it("works for a past month's charge collected through someone", async () => {
    const sheet = editPaymentSheetSchema.parse(await (await get("sam-utilities")).json());
    expect(sheet.rows.map((r) => r.value)).toEqual(["Priya", "Utilities · Sam · Oct 2026", "$82.46"]);
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    expect(await errorOf(await get("nope"))).toEqual({ status: 404, code: "no_charge" });
  });

  it.each(["jordan-utilities", "alex-rent", "jordan-refund"])("answers 409 not_paid for %s", async (id) => {
    expect(await errorOf(await get(id))).toEqual({ status: 409, code: "not_paid" });
  });
});

describe("PATCH /api/charges/:id/payment", () => {
  it("changes Received on and nothing else, and saving it again answers the same", async () => {
    for (let i = 0; i < 2; i++) {
      const response = await patch("jordan-rent", { paidOn: "2026-11-02" });
      expect(response.status).toBe(200);
      expect(editPaymentResponseSchema.parse(await response.json())).toEqual({
        chargeId: "jordan-rent",
        month: "2026-11",
        paidOn: "2026-11-02",
      });
    }
    const row = rows.find((r) => r.id === "jordan-rent")!;
    expect(row).toMatchObject({ paidCents: 95000, paidByPersonId: jordan });
  });

  it("accepts today", async () => {
    expect((await patch("jordan-rent", { paidOn: "2026-11-21" })).status).toBe(200);
  });

  it.each([{}, { paidOn: null }])("answers 422 no_date for %j", async (body) => {
    expect(await errorOf(await patch("jordan-rent", body))).toEqual({ status: 422, code: "no_date" });
  });

  it("answers 400 for a day after today", async () => {
    expect(await errorOf(await patch("jordan-rent", { paidOn: "2026-11-22" }))).toEqual({ status: 400, code: "invalid_request" });
  });

  it("answers 400 for a malformed body", async () => {
    expect((await patch("jordan-rent", "not json")).status).toBe(400);
    expect((await patch("jordan-rent", { paidOn: "21 Nov" })).status).toBe(400);
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    expect(await errorOf(await patch("nope", { paidOn: "2026-11-02" }))).toEqual({ status: 404, code: "no_charge" });
  });

  it.each(["jordan-utilities", "alex-rent", "jordan-refund"])("answers 409 not_paid for %s", async (id) => {
    expect(await errorOf(await patch(id, { paidOn: "2026-11-02" }))).toEqual({ status: 409, code: "not_paid" });
  });
});

describe("DELETE /api/charges/:id/payment", () => {
  it("removes the payment, and removing it again answers the same", async () => {
    for (let i = 0; i < 2; i++) {
      const response = await remove("sam-utilities");
      expect(response.status).toBe(200);
      expect(editPaymentResponseSchema.parse(await response.json())).toEqual({
        chargeId: "sam-utilities",
        month: "2026-10",
        paidOn: null,
      });
    }
    expect(rows.find((r) => r.id === "sam-utilities")).toMatchObject({ paidCents: null, paidOn: null, paidByPersonId: null });
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    expect(await errorOf(await remove("nope"))).toEqual({ status: 404, code: "no_charge" });
  });

  it.each(["alex-rent", "jordan-refund"])("answers 409 not_paid for %s", async (id) => {
    expect(await errorOf(await remove(id))).toEqual({ status: 409, code: "not_paid" });
  });
});
