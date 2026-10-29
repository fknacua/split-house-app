import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";
import { buildHome, type HomeChargeRow, type HomeInput, type HomeMessage, type HomePerson } from "./build-home";

const PEOPLE: HomePerson[] = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

function toRows(charges: EngineCharge[]): HomeChargeRow[] {
  return charges.map((c, i) => ({
    id: `charge-${i}`,
    personId: c.personId,
    payViaPersonId: c.payViaPersonId,
    category: c.category,
    label: c.label,
    amountCents: c.amountCents,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidCents: null,
    paidOn: null,
  }));
}

/** The people whose monthly message was opened on 2 Nov. */
function monthly(...personIds: string[]): HomeMessage[] {
  return personIds.map((personId) => ({
    personId,
    kind: "MONTHLY",
    chargeId: null,
    openedAt: new Date("2026-11-02T10:00:00+08:00"),
  }));
}

/** The tiles of a hero that has them (waiting and unsent). */
function tiles(home: ReturnType<typeof buildHome>) {
  if (home.hero.body.kind === "collecting") throw new Error("The collecting hero has no tiles");  return home.hero.body.tiles;
}

/** The November rent and recurring charges, as the database would return them. */
function novemberCharges(): HomeChargeRow[] {
  return toRows(buildMonthCharges(NOV_2026_CONFIG, "2026-11"));
}

/** The November charges once the bill is saved: rent, recurring and the utilities split. */
function novemberChargesWithBill(): HomeChargeRow[] {
  return toRows([
    ...buildMonthCharges(NOV_2026_CONFIG, "2026-11"),
    ...buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }),
  ]);
}

const BILL = { currentChargesCents: 41230, dueDate: new Date("2026-11-16"), paidCents: null, paidOn: null };

function input(overrides: Partial<HomeInput> = {}): HomeInput {
  return {
    month: "2026-11",
    today: "2026-11-01",
    status: "bill_missing",
    config: NOV_2026_CONFIG,
    people: PEOPLE,
    charges: novemberCharges(),
    bill: null,
    messages: [],
    ...overrides,
  };
}

describe("buildHome, bill_missing on 1 Nov", () => {
  const home = buildHome(input());

  it("names the month", () => {
    expect(home.month).toBe("2026-11");
    expect(home.monthName).toBe("November 2026");
    expect(home.status).toBe("bill_missing");
  });

  it("has one row per charge by due date, with no row for the owner", () => {
    expect(home.rows.map((r) => [r.dueDate, r.title])).toEqual([
      ["2026-11-01", "Rent · Jordan"],
      ["2026-11-04", "Utilities · Jordan"],
      ["2026-11-07", "Rent · Priya"],
      ["2026-11-07", "Starhub · Priya"],
      ["2026-11-07", "Utilities · Priya"],
      ["2026-11-07", "Utilities · Sam"],
      ["2026-11-16", "Utilities bill"],
      ["2026-11-28", "Rent · Sam"],
    ]);
  });

  it("shows the rent due today open, shaded, with Mark paid", () => {
    const row = home.rows[0];
    expect(row.badge).toEqual({ label: "Due today", tone: "info" });
    expect(row.tint).toBe("info");
    expect(row.expanded).toBe(true);
    expect(row.amount).toBe("$950.00");
    expect(row.detail).toBeNull();
    expect(row.actions).toEqual([
      { label: "Mark paid", tone: "outline", icon: "check", target: { kind: "mark-paid", chargeId: row.id } },
    ]);
  });

  it("shows every other charge as upcoming and closed", () => {
    const sam = home.rows.find((r) => r.title === "Rent · Sam")!;
    expect(sam.badge).toEqual({ label: "Upcoming", tone: "neutral" });
    expect(sam.tint).toBe("none");
    expect(sam.expanded).toBe(false);
    expect(sam.actions).toHaveLength(1);
  });

  it("projects utilities rows from the config, with no amount yet and no actions", () => {
    const jordan = home.rows.find((r) => r.title === "Utilities · Jordan")!;
    expect(jordan).toMatchObject({ amount: "—", badge: { label: "Needs bill", tone: "neutral" }, actions: [] });
    expect(jordan.note).toBe("Worked out once the utilities bill is uploaded.");
  });

  it("routes Sam's utilities via Priya, on Priya's due day", () => {
    const sam = home.rows.find((r) => r.title === "Utilities · Sam")!;
    expect(sam.dueDate).toBe("2026-11-07");
    expect(sam.detail).toBe("Pays via Priya");
    expect(sam.link.target).toEqual({ kind: "recipient", month: "2026-11", personId: PERSON_IDS.priya });
  });

  it("dates the bill row from the config and links to the upload", () => {
    const bill = home.rows.find((r) => r.id === "bill")!;
    expect(bill).toMatchObject({
      dueDate: "2026-11-16",
      amount: "—",
      detail: "You pay utilities",
      badge: { label: "Not uploaded", tone: "neutral" },
      actions: [],
      link: { label: "Upload bill", target: { kind: "bill-upload", month: "2026-11" } },
    });
  });

  it("has the waiting hero and the upload footer", () => {
    expect(home.hero.dateLine).toBe("1 Nov · Step 1 of 3");
    expect(home.hero.steps.map((s) => s.state)).toEqual(["current", "todo", "todo"]);
    expect(home.hero.compactStatus).toBe("Waiting on the utilities bill");
    expect(tiles(home)).toEqual([
      { label: "You’re fronting", value: "$3,602.50" },
      { label: "Utilities bill coverage", value: "No bill yet" },
    ]);
    expect(home.primaryAction).toEqual({
      label: "Upload utilities bill",
      icon: "upload",
      target: { kind: "bill-upload", month: "2026-11" },
    });
  });
});

describe("buildHome, draft on 1 Nov", () => {
  const draft = buildHome(input({ status: "draft" }));
  const missing = buildHome(input());

  it("puts the draft notice in the hero", () => {
    expect(draft.status).toBe("draft");
    expect(draft.hero.notice).toEqual({
      title: "Unfinished bill draft",
      text: "You started uploading a bill for November and didn’t save it.",
      actions: [
        { label: "Continue", tone: "primary", icon: null, target: { kind: "bill-draft-continue", month: "2026-11" } },
        { label: "Discard", tone: "outline", icon: null, target: { kind: "bill-draft-discard", month: "2026-11" } },
      ],
    });
  });

  it("is otherwise the same as bill_missing: rows and hero text", () => {
    expect(draft.rows).toEqual(missing.rows);
    expect({ ...draft.hero, notice: null }).toEqual(missing.hero);
  });

  it("turns the footer into Continue bill upload, which opens the draft", () => {
    expect(draft.primaryAction).toEqual({
      label: "Continue bill upload",
      icon: "file-pen",
      target: { kind: "bill-draft-continue", month: "2026-11" },
    });
  });

  it("has no hero notice when there is no draft", () => {
    expect(missing.hero.notice).toBeNull();
  });
});

describe("buildHome, paid charges", () => {
  it("drops Mark paid and the due-today shading, and lowers what you're fronting", () => {
    const charges = novemberCharges().map((c) =>
      c.personId === PERSON_IDS.jordan ? { ...c, paidCents: c.amountCents } : c,
    );
    const home = buildHome(input({ charges }));
    expect(home.rows[0]).toMatchObject({
      badge: { label: "Paid", tone: "success" },
      tint: "none",
      expanded: false,
      actions: [],
    });
    expect(tiles(home)[0].value).toBe("$2,652.50");
  });

  it("never shows a negative fronting amount", () => {
    const charges = novemberCharges().map((c) => ({ ...c, paidCents: c.amountCents + 1000 }));
    expect(tiles(buildHome(input({ charges })))[0].value).toBe("$0.00");
  });
});

describe("buildHome, unsent on 1 Nov", () => {
  const unsent = (overrides: Partial<HomeInput> = {}) =>
    buildHome(input({ status: "unsent", charges: novemberChargesWithBill(), bill: BILL, ...overrides }));
  const home = unsent();

  it("has the same rows by due date as before, now with real utilities charges", () => {
    expect(home.rows.map((r) => [r.dueDate, r.title])).toEqual([
      ["2026-11-01", "Rent · Jordan"],
      ["2026-11-04", "Utilities · Jordan"],
      ["2026-11-07", "Rent · Priya"],
      ["2026-11-07", "Starhub · Priya"],
      ["2026-11-07", "Utilities · Priya"],
      ["2026-11-07", "Utilities · Sam"],
      ["2026-11-16", "Utilities bill"],
      ["2026-11-28", "Rent · Sam"],
    ]);
    expect(home.rows.find((r) => r.title === "Utilities · Jordan")!.amount).toBe("$82.46");
  });

  it("marks Jordan's and Priya's utilities rows Not sent, open, with only a Review message link", () => {
    for (const title of ["Utilities · Jordan", "Utilities · Priya"]) {
      const row = home.rows.find((r) => r.title === title)!;
      expect(row.badge).toEqual({ label: "Not sent", tone: "primary" });
      expect(row.expanded).toBe(true);
      expect(row.actions).toEqual([]);
      expect(row.link.label).toBe("Review message");
    }
  });

  it("gives Sam's row no message of its own: Not sent, closed, View details to Priya's page", () => {
    const sam = home.rows.find((r) => r.title === "Utilities · Sam")!;
    expect(sam.badge).toEqual({ label: "Not sent", tone: "primary" });
    expect(sam.detail).toBe("Pays via Priya");
    expect(sam.expanded).toBe(false);
    expect(sam.actions).toEqual([]);
    expect(sam.link).toEqual({
      label: "View details",
      target: { kind: "recipient", month: "2026-11", personId: PERSON_IDS.priya },
    });
  });

  it("opens each Review message with the person themselves", () => {
    const target = (title: string) => home.rows.find((r) => r.title === title)!.link.target;
    expect(target("Utilities · Jordan")).toEqual({ kind: "recipient", month: "2026-11", personId: PERSON_IDS.jordan });
    expect(target("Utilities · Priya")).toEqual({ kind: "recipient", month: "2026-11", personId: PERSON_IDS.priya });
  });

  it("leaves rent and recurring rows as they were", () => {
    expect(home.rows[0]).toMatchObject({ badge: { label: "Due today", tone: "info" }, tint: "info", expanded: true });
    expect(home.rows[0].actions).toHaveLength(1);
    const starhub = home.rows.find((r) => r.title === "Starhub · Priya")!;
    expect(starhub).toMatchObject({ badge: { label: "Upcoming", tone: "neutral" }, expanded: false });
    expect(starhub.actions).toHaveLength(1);
    expect(home.rows.find((r) => r.title === "Rent · Sam")!.badge.label).toBe("Upcoming");
  });

  it("shows the saved bill: amount, days left, the note and a View bill link", () => {
    const bill = home.rows.find((r) => r.id === "bill")!;
    expect(bill).toMatchObject({
      dueDate: "2026-11-16",
      amount: "$412.30",
      detail: "You pay utilities",
      badge: { label: "In 15 days", tone: "neutral" },
      note: "Nothing collected yet. Shares go out with the messages.",
      actions: [],
      link: { label: "View bill", target: { kind: "bill-view", month: "2026-11" } },
    });
  });

  it("has the Bill's in hero at step 2, counting two messages (Sam rides in Priya's)", () => {
    expect(home.hero.dateLine).toBe("1 Nov · Step 2 of 3");
    expect(home.hero.steps.map((s) => s.state)).toEqual(["done", "current", "todo"]);
    expect(home.hero.compactStatus).toBe("2 messages to send");
    expect(home.hero.notice).toBeNull();
    expect(home.hero.body).toEqual({
      kind: "unsent",
      title: "Bill’s in. Send the breakdowns",
      text: "2 messages are ready. Open each one to review it, then send it on WhatsApp yourself.",
      tiles: [
        { label: "You’re fronting", value: "$3,602.50" },
        { label: "Utilities bill · due 16 Nov", value: "$412.30" },
      ],
    });
  });

  it("has no footer button", () => {
    expect(home.primaryAction).toBeNull();
  });

  it("uses the saved bill's due date over the config's billDueDay", () => {
    const later = unsent({ bill: { ...BILL, dueDate: new Date("2026-11-20") } });
    expect(later.rows.find((r) => r.id === "bill")!.dueDate).toBe("2026-11-20");
    expect(tiles(later)[1].label).toBe("Utilities bill · due 20 Nov");
  });

  it("falls back to the config's billDueDay when the bill has no due date", () => {
    const fallback = unsent({ bill: { ...BILL, dueDate: null } });
    expect(fallback.rows.find((r) => r.id === "bill")!.dueDate).toBe("2026-11-16");
  });

  it("drops a payer's Not sent rows once their message is opened, and the count with it", () => {
    const afterPriya = unsent({ messages: monthly(PERSON_IDS.priya) });
    expect(afterPriya.hero.compactStatus).toBe("1 message to send");
    expect(afterPriya.hero.body).toMatchObject({
      text: "1 message is ready. Open it to review it, then send it on WhatsApp yourself.",
    });
    expect(afterPriya.rows.find((r) => r.title === "Utilities · Jordan")!.badge.label).toBe("Not sent");
    for (const title of ["Utilities · Priya", "Utilities · Sam"]) {
      const row = afterPriya.rows.find((r) => r.title === title)!;
      expect(row.badge.label).toBe("Sent, unpaid");
      expect(row.expanded).toBe(false);
      expect(row.actions).toHaveLength(1);
    }
  });

  it("never needs a message for Sam, so nothing is Not sent once Jordan and Priya have one", () => {
    const afterBoth = unsent({ messages: monthly(PERSON_IDS.priya, PERSON_IDS.jordan) });
    expect(afterBoth.rows.some((r) => r.badge.label === "Not sent")).toBe(false);
  });

  it("shows no Not sent badge on a paid utilities charge", () => {
    const charges = novemberChargesWithBill().map((c) =>
      c.category === "UTILITIES" && c.personId === PERSON_IDS.jordan ? { ...c, paidCents: c.amountCents } : c,
    );
    expect(unsent({ charges }).rows.find((r) => r.title === "Utilities · Jordan")!.badge.label).toBe("Paid");
  });
});

describe("buildHome, collecting on 3 Nov", () => {
  const PAID_ON = new Date("2026-11-03");

  /** The November charges with the given people's charges of one category paid in full on 3 Nov. */
  function withPaid(paid: Array<[string, string]>): HomeChargeRow[] {
    return novemberChargesWithBill().map((c) =>
      paid.some(([personId, category]) => c.personId === personId && c.category === category)
        ? { ...c, paidCents: c.amountCents, paidOn: PAID_ON }
        : c,
    );
  }

  const base = withPaid([
    [PERSON_IDS.sam, "RENT"],
    [PERSON_IDS.priya, "UTILITIES"],
  ]);
  const jordanRent = base.find((c) => c.personId === PERSON_IDS.jordan && c.category === "RENT")!;
  const messages: HomeMessage[] = [
    ...monthly(PERSON_IDS.jordan, PERSON_IDS.priya),
    {
      personId: PERSON_IDS.jordan,
      kind: "NUDGE",
      chargeId: jordanRent.id,
      openedAt: new Date("2026-11-02T18:00:00+08:00"),
    },
  ];
  const collecting = (overrides: Partial<HomeInput> = {}) =>
    buildHome(
      input({ status: "collecting", today: "2026-11-03", charges: base, bill: BILL, messages, ...overrides }),
    );
  const home = collecting();
  const row = (title: string) => home.rows.find((r) => r.title === title)!;

  it("shows overdue rent shaded and open, with the nudge date and Nudge again beside Mark paid", () => {
    expect(row("Rent · Jordan")).toMatchObject({
      badge: { label: "Overdue 2 days", tone: "danger" },
      tint: "warning",
      expanded: true,
      detail: "Nudged 2 Nov",
    });
    expect(row("Rent · Jordan").actions).toEqual([
      {
        label: "Nudge again",
        tone: "warning",
        icon: "bell",
        target: { kind: "recipient", month: "2026-11", personId: PERSON_IDS.jordan },
      },
      { label: "Mark paid", tone: "outline", icon: "check", target: { kind: "mark-paid", chargeId: jordanRent.id } },
    ]);
  });

  it("offers plain Nudge when the charge was never nudged", () => {
    const noNudge = collecting({ messages: monthly(PERSON_IDS.jordan, PERSON_IDS.priya) });
    const rent = noNudge.rows.find((r) => r.title === "Rent · Jordan")!;
    expect(rent.detail).toBe("Sent 2 Nov");
    expect(rent.actions.map((a) => a.label)).toEqual(["Nudge", "Mark paid"]);
  });

  it("shows tomorrow's utilities as Due tomorrow, sent, closed", () => {
    expect(row("Utilities · Jordan")).toMatchObject({
      badge: { label: "Due tomorrow", tone: "info" },
      tint: "none",
      expanded: false,
      detail: "Sent 2 Nov",
    });
    expect(row("Utilities · Jordan").actions).toHaveLength(1);
  });

  it("shows charges further out as Sent, unpaid when the payer's message is out, else Upcoming", () => {
    expect(row("Rent · Priya").badge).toEqual({ label: "Sent, unpaid", tone: "neutral" });
    expect(row("Starhub · Priya").detail).toBe("Sent 2 Nov");
    expect(row("Utilities · Sam")).toMatchObject({
      badge: { label: "Sent, unpaid", tone: "neutral" },
      detail: "Pays via Priya · Sent 2 Nov",
    });
    expect(row("Rent · Sam").badge.label).toBe("Paid");
  });

  it("shows paid charges as Paid with the date, closed, with no actions", () => {
    for (const title of ["Rent · Sam", "Utilities · Priya"]) {
      expect(row(title)).toMatchObject({ badge: { label: "Paid", tone: "success" }, detail: "Paid 3 Nov", actions: [] });
    }
  });

  it("limits Due in N days to three days and is Upcoming when nobody was messaged", () => {
    const fourDays = collecting({ messages: [] });
    expect(fourDays.rows.find((r) => r.title === "Rent · Priya")!.badge.label).toBe("Upcoming");
    const threeDays = collecting({ today: "2026-11-04" });
    expect(threeDays.rows.find((r) => r.title === "Rent · Priya")!.badge).toEqual({
      label: "Due in 3 days",
      tone: "neutral",
    });
    expect(threeDays.rows.find((r) => r.title === "Utilities · Jordan")!.badge.label).toBe("Due today");
  });

  it("says Overdue 1 day in the singular", () => {
    const late = collecting({ today: "2026-11-08" });
    expect(late.rows.find((r) => r.title === "Rent · Priya")!.badge.label).toBe("Overdue 1 day");
  });

  it("shows the bill row open with Mark bill paid and how much is covered", () => {
    expect(row("Utilities bill")).toMatchObject({
      amount: "$412.30",
      badge: { label: "In 13 days", tone: "neutral" },
      expanded: true,
      note: "$247.38 of $412.30 covered so far.",
      actions: [
        { label: "Mark bill paid", tone: "outline", icon: "check", target: { kind: "mark-bill-paid", month: "2026-11" } },
      ],
    });
  });

  it("has the collecting hero: fronting with what is back, and bill coverage", () => {
    expect(home.hero.dateLine).toBe("3 Nov · Collecting");
    expect(home.hero.steps.map((s) => s.state)).toEqual(["done", "done", "current"]);
    expect(home.hero.compactStatus).toBe("Collecting · $2,652.50 fronted");
    expect(home.hero.notice).toBeNull();
    expect(home.hero.body).toEqual({
      kind: "collecting",
      fronting: {
        label: "You’re fronting",
        value: "$2,652.50",
        note: "Rent, aircon and other charges paid for others · $950.00 back so far",
      },
      coverage: {
        label: "Utilities bill covered",
        text: "$247.38 of $412.30",
        percent: 60,
        note: "Your share and 1 of 3 others paid · due 16 Nov",
      },
    });
  });

  it("covers only Francis's own share when nobody has paid their utilities", () => {
    const unpaid = collecting({ charges: withPaid([]) });
    expect(unpaid.hero.body).toMatchObject({
      coverage: { text: "$123.69 of $412.30", percent: 30, note: "Your share only so far · due 16 Nov" },
    });
  });

  it("never covers more than the bill, however much was paid", () => {
    const over = collecting({ charges: novemberChargesWithBill().map((c) => ({ ...c, paidCents: c.amountCents * 2 })) });
    expect(over.hero.body).toMatchObject({ coverage: { text: "$412.30 of $412.30", percent: 100 } });
  });

  it("has the Record payment footer", () => {
    expect(home.primaryAction).toEqual({
      label: "Record payment",
      icon: "banknote",
      target: { kind: "record-payment", month: "2026-11" },
    });
  });

  it("marks the bill overdue once its due date passes", () => {
    const late = collecting({ today: "2026-11-18" });
    expect(late.rows.find((r) => r.id === "bill")!.badge).toEqual({ label: "Overdue 2 days", tone: "danger" });
  });
});

describe("buildHome, payments due today while collecting (4 Nov)", () => {
  const paidOn = new Date("2026-11-03");
  const charges = novemberChargesWithBill().map((c) =>
    (c.personId === PERSON_IDS.jordan && c.category === "RENT") ||
    (c.personId === PERSON_IDS.sam && c.category === "RENT") ||
    (c.personId === PERSON_IDS.priya && c.category === "UTILITIES")
      ? { ...c, paidCents: c.amountCents, paidOn }
      : c,
  );
  const messages = monthly(PERSON_IDS.jordan, PERSON_IDS.priya);
  const collecting = (overrides: Partial<HomeInput> = {}) =>
    buildHome(input({ status: "collecting", today: "2026-11-04", charges, bill: BILL, messages, ...overrides }));
  const home = collecting();

  it("puts a one-line Alert with the amount in the hero, and the same words in the compact status", () => {
    expect(home.hero.dueToday).toEqual({ text: "Jordan’s utilities are due today", amount: "$82.46" });
    expect(home.hero.compactStatus).toBe("Jordan’s utilities due today");
    expect(home.hero.dateLine).toBe("4 Nov · Collecting");
  });

  it("shades Jordan's utilities row, opens it and adds the payment check note", () => {
    const row = home.rows.find((r) => r.title === "Utilities · Jordan")!;
    expect(row).toMatchObject({
      badge: { label: "Due today", tone: "info" },
      tint: "info",
      expanded: true,
      detail: "Sent 2 Nov",
      note: "You’ll get a payment check tonight if it’s still unpaid.",
    });
    expect(row.actions.map((a) => a.label)).toEqual(["Mark paid"]);
  });

  it("shows Jordan's paid rent as Paid with the date", () => {
    expect(home.rows.find((r) => r.title === "Rent · Jordan")).toMatchObject({
      badge: { label: "Paid", tone: "success" },
      detail: "Paid 3 Nov",
    });
  });

  it("has no Alert and the usual compact status when nothing is due today", () => {
    const quiet = collecting({ today: "2026-11-03" });
    expect(quiet.hero.dueToday).toBeNull();
    expect(quiet.hero.compactStatus).toBe("Collecting · $1,702.50 fronted");
    expect(quiet.rows.find((r) => r.title === "Utilities · Jordan")!.note).toBeNull();
  });

  it("says rent is, and counts several payments with their total", () => {
    const rentDue = collecting({
      today: "2026-11-01",
      charges: novemberChargesWithBill().map((c) =>
        c.personId === PERSON_IDS.jordan && c.category === "UTILITIES" ? { ...c, paidCents: c.amountCents, paidOn } : c,
      ),
    });
    expect(rentDue.hero.dueToday).toEqual({ text: "Jordan’s rent is due today", amount: "$950.00" });
    const both = collecting({ today: "2026-11-07", charges: novemberChargesWithBill() });
    expect(both.hero.dueToday).toEqual({ text: "4 payments are due today", amount: "$1,908.65" });
    expect(both.hero.compactStatus).toBe("4 payments due today");
  });

  it("shows no Alert outside collecting, even with a payment due today", () => {
    const unsent = buildHome(input({ status: "unsent", charges: novemberChargesWithBill(), bill: BILL }));
    expect(unsent.hero.dueToday).toBeNull();
    expect(unsent.rows[0].note).toBeNull();
  });
});

describe("buildHome, settled on 29 Nov", () => {
  const charges = novemberChargesWithBill().map((c) => ({ ...c, paidCents: c.amountCents, paidOn: new Date("2026-11-03") }));
  const paidBill = { ...BILL, paidCents: 41230, paidOn: new Date("2026-11-16") };
  const settled = (overrides: Partial<HomeInput> = {}) =>
    buildHome(
      input({
        status: "settled",
        today: "2026-11-29",
        charges,
        bill: paidBill,
        messages: monthly(PERSON_IDS.jordan, PERSON_IDS.priya),
        ...overrides,
      }),
    );
  const home = settled();

  it("shows the settled hero: all steps done, the check title, two tiles", () => {
    expect(home.status).toBe("settled");
    expect(home.hero.dateLine).toBe("29 Nov · Done");
    expect(home.hero.steps.map((s) => s.state)).toEqual(["done", "done", "done"]);
    expect(home.hero.compactStatus).toBe("November is settled");
    expect(home.hero.body).toEqual({
      kind: "settled",
      title: "November is settled",
      text: "Everyone’s paid. Utilities bill paid 16 Nov.",
      tiles: [
        { label: "You’re fronting", value: "$0.00" },
        { label: "Utilities bill covered", value: "$412.30" },
      ],
    });
    expect(home.hero.dueToday).toBeNull();
    expect(home.hero.notice).toBeNull();
  });

  it("has no footer button", () => {
    expect(home.primaryAction).toBeNull();
  });

  it("shows every row Paid, closed, with no actions and no row-level payment prompts", () => {
    for (const row of home.rows) {
      expect(row.badge).toEqual({ label: "Paid", tone: "success" });
      expect(row).toMatchObject({ tint: "none", expanded: false, actions: [], note: null });
    }
  });

  it("dates each charge's payment, and the bill's", () => {
    expect(home.rows.find((r) => r.title === "Rent · Jordan")!.detail).toBe("Paid 3 Nov");
    expect(home.rows.find((r) => r.id === "bill")).toMatchObject({
      amount: "$412.30",
      detail: "You paid 16 Nov",
      link: { label: "View bill", target: { kind: "bill-view", month: "2026-11" } },
    });
  });

  it("drops the bill's Mark bill paid once the bill is paid, even while still collecting", () => {
    const collecting = settled({ status: "collecting", today: "2026-11-05", charges: novemberChargesWithBill() });
    expect(collecting.rows.find((r) => r.id === "bill")).toMatchObject({
      badge: { label: "Paid", tone: "success" },
      expanded: false,
      actions: [],
      note: null,
    });
  });

  it("leaves out the bill's paid date when none is recorded", () => {
    const noDate = settled({ bill: { ...paidBill, paidOn: null } });
    expect(noDate.hero.body).toMatchObject({ text: "Everyone’s paid." });
  });

  it("names the next month in the Close dialog across the new year", () => {
    expect(settled({ month: "2026-12" }).nextMonthAction?.dialog).toMatchObject({
      title: "Close December?",
      body: "This closes December 2026 and starts January. You can’t undo this.",
    });
  });
});
