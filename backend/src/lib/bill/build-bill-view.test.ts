import { billViewResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";
import { buildBillView, type BillViewBillRow, type BillViewChargeRow, type BillViewInput } from "./build-bill-view";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

function toRows(charges: EngineCharge[]): BillViewChargeRow[] {
  return charges.map((c) => ({
    personId: c.personId,
    payViaPersonId: c.payViaPersonId,
    category: c.category,
    amountCents: c.amountCents,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidCents: null,
    paidOn: null,
  }));
}

/** November's rent, recurring and utilities charges once the $412.30 bill is saved. */
function novemberCharges(): BillViewChargeRow[] {
  return toRows([
    ...buildMonthCharges(NOV_2026_CONFIG, "2026-11"),
    ...buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }),
  ]);
}

/** Marks a person's utilities charge paid in full on the given day. */
function payUtilities(charges: BillViewChargeRow[], personId: string, day: string): BillViewChargeRow[] {
  return charges.map((c) =>
    c.category === "UTILITIES" && c.personId === personId
      ? { ...c, paidCents: c.amountCents, paidOn: new Date(day) }
      : c,
  );
}

const BILL: BillViewBillRow = {
  currentChargesCents: 41230,
  billingPeriodStart: new Date("2026-10-03"),
  billingPeriodEnd: new Date("2026-11-02"),
  dueDate: new Date("2026-11-16"),
  lines: [
    { label: "Electricity", cents: 26845 },
    { label: "Gas", cents: 4120 },
    { label: "Water", cents: 10265 },
  ],
  paidCents: null,
  paidOn: null,
  createdAt: new Date("2026-11-02T10:00:00+08:00"),
  file: { filename: "Utilities_Bill_Nov2026.pdf", pageCount: 2 },
};

/** Priya's and Jordan's monthly messages, opened on 2 Nov: Sam's utilities ride in Priya's. */
const MESSAGES_OUT = [
  { personId: PERSON_IDS.priya, kind: "MONTHLY" as const },
  { personId: PERSON_IDS.jordan, kind: "MONTHLY" as const },
];

function input(overrides: Partial<BillViewInput> = {}): BillViewInput {
  return {
    month: "2026-11",
    today: "2026-11-04",
    isActiveMonth: true,
    config: NOV_2026_CONFIG,
    people: PEOPLE,
    charges: novemberCharges(),
    bill: BILL,
    messages: MESSAGES_OUT,
    ...overrides,
  };
}

describe("buildBillView, collecting on 4 Nov", () => {
  const view = buildBillView(input());

  it("parses with the shared schema", () => {
    expect(billViewResponseSchema.parse(view)).toEqual(view);
  });

  it("names the month", () => {
    expect(view.month).toBe("2026-11");
    expect(view.monthName).toBe("November 2026");
  });

  it("shows Current Charges, the days to the due date and the lines", () => {
    expect(view.hero).toEqual({
      amount: "$412.30",
      badge: { label: "Due in 12 days", tone: "neutral" },
      lines: [
        { label: "Electricity", amount: "$268.45" },
        { label: "Gas", amount: "$41.20" },
        { label: "Water", amount: "$102.65" },
      ],
    });
  });

  it("counts only the user's share as collected so far", () => {
    expect(view.collection).toMatchObject({ title: "Collected so far", note: "$123.69 of $412.30", percent: 30 });
  });

  it("lists the user first, then the household, with shares and Waiting", () => {
    expect(view.collection.people.map((p) => [p.name, p.shares, p.amount, p.badge.label])).toEqual([
      ["You", "1.5 shares", "$123.69", "Covered"],
      ["Priya", "1.5 shares", "$123.69", "Waiting"],
      ["Sam", "1 share", "$82.46", "Waiting"],
      ["Jordan", "1 share", "$82.46", "Waiting"],
    ]);
  });

  it("lists the facts without a weekday", () => {
    expect(view.facts).toEqual([
      { label: "Bill month", value: "November 2026" },
      { label: "Billing period", value: "3 Oct – 2 Nov 2026" },
      { label: "Due date", value: "16 Nov 2026" },
    ]);
  });

  it("shows the file with its pages and the day it was saved", () => {
    expect(view.file).toEqual({ filename: "Utilities_Bill_Nov2026.pdf", meta: "2 pages · added 2 Nov" });
  });

  it("offers Mark bill paid", () => {
    expect(view.action).toEqual({ label: "Mark bill paid", target: { kind: "mark-bill-paid", month: "2026-11" } });
  });
});

describe("buildBillView, per-person chips", () => {
  it("shows the day each person paid and adds it to the collected amount", () => {
    const view = buildBillView(input({ charges: payUtilities(novemberCharges(), PERSON_IDS.jordan, "2026-11-03") }));
    expect(view.collection.people.find((p) => p.name === "Jordan")!.badge).toEqual({
      label: "Paid 3 Nov",
      tone: "success",
    });
    expect(view.collection.note).toBe("$206.15 of $412.30");
  });

  it("shows Overdue past a person's due date, Sam on Priya's day", () => {
    const view = buildBillView(input({ today: "2026-11-09" }));
    expect(view.collection.people.map((p) => [p.name, p.badge.label])).toEqual([
      ["You", "Covered"],
      ["Priya", "Overdue 2 days"],
      ["Sam", "Overdue 2 days"],
      ["Jordan", "Overdue 5 days"],
    ]);
  });

  it("shows Not sent until the payer's message is opened, and no Mark bill paid", () => {
    const view = buildBillView(input({ today: "2026-11-09", messages: [MESSAGES_OUT[1]] }));
    expect(view.collection.people.map((p) => [p.name, p.badge])).toEqual([
      ["You", { label: "Covered", tone: "success" }],
      ["Priya", { label: "Not sent", tone: "primary" }],
      ["Sam", { label: "Not sent", tone: "primary" }],
      ["Jordan", { label: "Overdue 5 days", tone: "danger" }],
    ]);
    expect(view.action).toBeNull();
  });

  it("still shows Paid for someone who paid before their message", () => {
    const view = buildBillView(
      input({ messages: [], charges: payUtilities(novemberCharges(), PERSON_IDS.jordan, "2026-11-01") }),
    );
    expect(view.collection.people.find((p) => p.name === "Jordan")!.badge.label).toBe("Paid 1 Nov");
  });
});

describe("buildBillView, unsent on 1 Nov", () => {
  const view = buildBillView(input({ today: "2026-11-01", messages: [] }));

  it("shows Not sent for everyone but the user, and no footer", () => {
    expect(view.collection.people.map((p) => p.badge.label)).toEqual(["Covered", "Not sent", "Not sent", "Not sent"]);
    expect(view.action).toBeNull();
  });

  it("counts the user's share as collected", () => {
    expect(view.collection).toMatchObject({ title: "Collected so far", note: "$123.69 of $412.30", percent: 30 });
  });
});

describe("buildBillView, paid", () => {
  let charges = novemberCharges();
  charges = payUtilities(charges, PERSON_IDS.priya, "2026-11-05");
  charges = payUtilities(charges, PERSON_IDS.sam, "2026-11-06");
  charges = payUtilities(charges, PERSON_IDS.jordan, "2026-11-04");
  const view = buildBillView(
    input({
      today: "2026-11-29",
      charges,
      bill: { ...BILL, paidCents: 41230, paidOn: new Date("2026-11-16") },
    }),
  );

  it("shows the paid chip and the day the user paid", () => {
    expect(view.hero.badge).toEqual({ label: "Paid 16 Nov", tone: "success" });
    expect(view.facts.at(-1)).toEqual({ label: "You paid", value: "16 Nov 2026" });
  });

  it("is fully collected", () => {
    expect(view.collection).toMatchObject({ title: "Fully collected", note: "$412.30 of $412.30", percent: 100 });
    expect(view.collection.people.map((p) => p.badge.label)).toEqual(["Covered", "Paid 5 Nov", "Paid 6 Nov", "Paid 4 Nov"]);
  });

  it("has no footer", () => {
    expect(view.action).toBeNull();
  });

  it("says Collected so far when the bill is paid before everyone paid", () => {
    const partial = buildBillView(input({ bill: { ...BILL, paidCents: 41230, paidOn: new Date("2026-11-16") } }));
    expect(partial.collection.title).toBe("Collected so far");
  });
});

describe("buildBillView, edge cases", () => {
  it("offers no Mark bill paid on a month Home no longer shows", () => {
    expect(buildBillView(input({ isActiveMonth: false })).action).toBeNull();
  });

  it("counts down Due today, Due tomorrow and Overdue on the bill", () => {
    expect(buildBillView(input({ today: "2026-11-16" })).hero.badge).toEqual({ label: "Due today", tone: "info" });
    expect(buildBillView(input({ today: "2026-11-15" })).hero.badge).toEqual({ label: "Due tomorrow", tone: "info" });
    expect(buildBillView(input({ today: "2026-11-18" })).hero.badge).toEqual({ label: "Overdue 2 days", tone: "danger" });
  });

  it("falls back to the config's due day for a bill saved without one", () => {
    const view = buildBillView(input({ bill: { ...BILL, dueDate: null } }));
    expect(view.facts.find((f) => f.label === "Due date")!.value).toBe("16 Nov 2026");
  });

  it("shows a dash for a line saved with no amount", () => {
    const lines = [{ label: "Water", cents: null }];
    expect(buildBillView(input({ bill: { ...BILL, lines } })).hero.lines).toEqual([{ label: "Water", amount: "—" }]);
  });

  it("leaves out the billing period when it is not stored", () => {
    const view = buildBillView(input({ bill: { ...BILL, billingPeriodStart: null, billingPeriodEnd: null } }));
    expect(view.facts.map((f) => f.label)).toEqual(["Bill month", "Due date"]);
  });

  it("shows only the day added when the page count is unknown, and no row without a file", () => {
    const unknown = buildBillView(input({ bill: { ...BILL, file: { filename: "bill.pdf", pageCount: null } } }));
    expect(unknown.file).toEqual({ filename: "bill.pdf", meta: "added 2 Nov" });
    const single = buildBillView(input({ bill: { ...BILL, file: { filename: "bill.pdf", pageCount: 1 } } }));
    expect(single.file!.meta).toBe("1 page · added 2 Nov");
    expect(buildBillView(input({ bill: { ...BILL, file: null } })).file).toBeNull();
  });
});
