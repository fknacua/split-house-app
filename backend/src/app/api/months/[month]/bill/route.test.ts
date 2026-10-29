import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { billViewResponseSchema, checkBillResponseSchema, HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET as getBill, POST as saveBill } from "./route";
import { GET as getDraft, POST as uploadDraft } from "../bill-draft/route";
import { POST as checkDraft } from "../bill-draft/check/route";
import { POST as discardDraft } from "../bill-draft/discard/route";

const params = (month: string) => ({ params: Promise.resolve({ month }) });

describe("POST /api/months/:month/bill", () => {
  it("returns 400 for a bad month", async () => {
    const response = await saveBill(new Request("http://localhost", { method: "POST", body: "{}" }), params("2026-13"));
    expect(response.status).toBe(400);
  });

  const filled = {
    currentChargesCents: 41230,
    billMonth: "2026-11",
    dueDate: "2026-11-16",
    billingPeriodStart: "2026-10-03",
    billingPeriodEnd: "2026-11-02",
    lines: [],
  };

  it.each([
    ["Current Charges is not above zero", { currentChargesCents: 0 }],
    ["the bill month is missing", { billMonth: null }],
    ["the due date is missing", { dueDate: null }],
    ["the billing period start is missing", { billingPeriodStart: null }],
    ["the billing period end is missing", { billingPeriodEnd: null }],
  ])("returns 400 when %s", async (_name, change) => {
    const body = JSON.stringify({ ...filled, ...change });
    const response = await saveBill(new Request("http://localhost", { method: "POST", body }), params("2026-11"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });
});

describe("POST /api/months/:month/bill-draft/check", () => {
  const fields = {
    currentChargesCents: null,
    billMonth: "2026-10",
    dueDate: null,
    billingPeriodStart: null,
    billingPeriodEnd: null,
    subtotalCents: null,
    lines: [],
  };
  const post = (month: string, body: unknown) =>
    checkDraft(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), params(month));

  it("returns the blockers, parsing with the shared schema", async () => {
    const response = await post("2026-11", fields);
    expect(response.status).toBe(200);
    const check = checkBillResponseSchema.parse(await response.json());
    expect(check.blockers.map((b) => b.field)).toEqual(["billMonth"]);
  });

  it("returns no blockers for a bill that matches the month", async () => {
    const matching = { ...fields, billMonth: "2026-11", billingPeriodStart: "2026-10-03", billingPeriodEnd: "2026-11-02" };
    const response = await post("2026-11", matching);
    expect(checkBillResponseSchema.parse(await response.json())).toEqual({ blockers: [], linesNote: null, warnings: [] });
  });

  it("returns the lines note when the lines and the Subtotal are there, parsing with the shared schema", async () => {
    const lines = [{ label: "Electricity", cents: 21000 }];
    const response = await post("2026-11", { ...fields, subtotalCents: 35000, lines });
    const check = checkBillResponseSchema.parse(await response.json());
    expect(check.linesNote?.title).toBe("Lines don’t add up to the Subtotal");
  });

  it("returns how many lines have no amount, parsing with the shared schema", async () => {
    const lines = [
      { label: "Electricity", cents: 21000 },
      { label: "Water", cents: null },
    ];
    const check = checkBillResponseSchema.parse(await (await post("2026-11", { ...fields, lines })).json());
    expect(check.linesNote?.title).toBe("1 line not found");
  });

  it("returns a billing period blocker for a period that starts in the wrong month", async () => {
    const late = { ...fields, billMonth: "2026-11", billingPeriodStart: "2026-11-03", billingPeriodEnd: "2026-12-02" };
    const check = checkBillResponseSchema.parse(await (await post("2026-11", late)).json());
    expect(check.blockers.map((b) => b.field)).toEqual(["billingPeriod"]);
  });

  it("returns 400 for a bad month or a body that is not the form's values", async () => {
    expect((await post("2026-13", fields)).status).toBe(400);
    expect((await post("2026-11", { billMonth: "Nov" })).status).toBe(400);
  });
});

describe("/api/months/:month/bill-draft", () => {
  it("POST returns 400 without a multipart file", async () => {
    const response = await uploadDraft(new Request("http://localhost", { method: "POST", body: "{}" }), params("2026-11"));
    expect(response.status).toBe(400);
  });

  it("POST returns 400 when the form has no file", async () => {
    const form = new FormData();
    form.append("file", "not a file");
    const response = await uploadDraft(new Request("http://localhost", { method: "POST", body: form }), params("2026-11"));
    expect(response.status).toBe(400);
  });

  it("GET returns 400 for a bad month", async () => {
    const response = await getDraft(new Request("http://localhost"), params("Nov"));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/months/:month/bill-draft/discard", () => {
  it("returns 400 for a bad month", async () => {
    const response = await discardDraft(new Request("http://localhost", { method: "POST" }), params("2026-13"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });
});

describe("GET /api/months/:month/bill", () => {
  /** Points the mocked Prisma client at a November with its bill saved, or with none. */
  function useNovember(bill: object | null) {
    Object.assign(prisma, {
      bill: { findUnique: async () => bill },
      month: {
        findFirst: async () => ({ month: "2026-11" }),
        findUnique: async () => ({
          householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
        }),
      },
      person: { findMany: async () => [{ id: PERSON_IDS.alex, name: "Alex", isOwner: true }] },
      charge: {
        findMany: async () => [
          {
            personId: PERSON_IDS.alex,
            payViaPersonId: null,
            category: "UTILITIES",
            amountCents: 12369,
            dueDate: null,
            paidCents: null,
            paidOn: null,
          },
        ],
      },
      messageEvent: { findMany: async () => [] },
    });
  }

  it("returns the bill, parsing with the shared schema", async () => {
    useNovember({
      currentChargesCents: 41230,
      billingPeriodStart: new Date("2026-10-03"),
      billingPeriodEnd: new Date("2026-11-02"),
      dueDate: new Date("2026-11-16"),
      lines: [{ label: "Electricity", cents: 26845 }],
      paidCents: null,
      paidOn: null,
      createdAt: new Date("2026-11-02T10:00:00+08:00"),
      file: { filename: "bill.pdf", pageCount: 2 },
    });
    const response = await getBill(new Request("http://localhost"), params("2026-11"));
    expect(response.status).toBe(200);
    const view = billViewResponseSchema.parse(await response.json());
    expect(view.hero.amount).toBe("$412.30");
  });

  it("returns 404 no_bill when the month has no saved bill", async () => {
    useNovember(null);
    const response = await getBill(new Request("http://localhost"), params("2026-11"));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_bill");
  });

  it("returns 400 for a bad month", async () => {
    const response = await getBill(new Request("http://localhost"), params("2026-13"));
    expect(response.status).toBe(400);
  });
});
