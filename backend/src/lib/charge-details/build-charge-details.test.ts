import { describe, expect, it } from "vitest";
import { chargeDetailsResponseSchema, type HomeStatus } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import {
  buildChargeDetails,
  type ChargeDetailsCharge,
  type ChargeDetailsInput,
  type ChargeDetailsMessage,
} from "./build-charge-details";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

function charge(overrides: Partial<ChargeDetailsCharge>): ChargeDetailsCharge {
  return {
    id: "charge-1",
    month: "2026-11",
    personId: PERSON_IDS.jordan,
    payViaPersonId: null,
    category: "RENT",
    label: "Rent",
    amountCents: 95000,
    dueDate: new Date("2026-11-01"),
    paidCents: null,
    paidOn: null,
    ...overrides,
  };
}

const JORDAN_RENT = charge({});
const JORDAN_UTILITIES = charge({ id: "charge-2", category: "UTILITIES", label: "Utilities", amountCents: 8246, dueDate: new Date("2026-11-04") });
const PRIYA_RENT = charge({ id: "charge-3", personId: PERSON_IDS.priya, amountCents: 167500, dueDate: new Date("2026-11-07") });
// Stored with no due date: it uses Priya's utilities day, 7 Nov.
const SAM_UTILITIES = charge({
  id: "charge-4",
  personId: PERSON_IDS.sam,
  payViaPersonId: PERSON_IDS.priya,
  category: "UTILITIES",
  label: "Utilities",
  amountCents: 8246,
  dueDate: null,
});

function monthly(personId: string): ChargeDetailsMessage {
  return { personId, kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") };
}

function nudge(chargeId: string): ChargeDetailsMessage {
  return { personId: PERSON_IDS.jordan, kind: "NUDGE", chargeId, openedAt: new Date("2026-11-02T18:00:00+08:00") };
}

/** Builds the details and checks them against the shared contract. `messageUnsent` is worked out by the service (`isChargeUnsent`, tested with it). */
function details(
  c: ChargeDetailsCharge,
  today: string,
  messages: ChargeDetailsMessage[] = [],
  monthStatus: HomeStatus = "collecting",
  messageUnsent = false,
  links: Partial<Pick<ChargeDetailsInput, "fixes" | "corrections" | "canCorrect">> = {},
) {
  const input: ChargeDetailsInput = {
    today,
    config: NOV_2026_CONFIG,
    charge: c,
    people: PEOPLE,
    messages,
    monthStatus,
    messageUnsent,
    fixes: null,
    corrections: [],
    canCorrect: false,
    ...links,
  };
  return chargeDetailsResponseSchema.parse(buildChargeDetails(input));
}

const labels = (d: ReturnType<typeof details>) => d.footer.map((a) => a.label);

describe("buildChargeDetails", () => {
  it("overdue and nudged: the whole page, with Nudge again above Mark paid", () => {
    const d = details(JORDAN_RENT, "2026-11-03", [monthly(PERSON_IDS.jordan), nudge(JORDAN_RENT.id)]);
    expect(d).toEqual({
      chargeId: JORDAN_RENT.id,
      month: "2026-11",
      title: "Rent · Jordan",
      monthName: "November 2026",
      amount: { value: "$950.00", chip: { label: "Overdue 2 days", tone: "danger" }, note: null },
      facts: [
        { kind: "text", label: "Payer", value: "Jordan" },
        { kind: "text", label: "Payment routing", value: "Direct" },
        { kind: "text", label: "Due", value: "01 Nov 2026" },
        { kind: "pill", label: "Payment status", badge: { label: "Unpaid", tone: "neutral" } },
      ],
      activity: [
        { title: "Nudged", date: "02 Nov 2026" },
        { title: "Monthly message sent", date: "02 Nov 2026" },
      ],
      footer: [
        {
          label: "Nudge again",
          tone: "warning",
          icon: "bell",
          target: { kind: "send-nudge", personId: PERSON_IDS.jordan, chargeIds: [JORDAN_RENT.id] },
        },
        { label: "Mark paid", tone: "outline", icon: "check", target: { kind: "mark-paid", chargeIds: [JORDAN_RENT.id] } },
      ],
      deleteCorrection: null,
    });
  });

  it("overdueNew: plain Nudge once the monthly message is out and nothing was nudged", () => {
    const d = details(JORDAN_RENT, "2026-11-02", [monthly(PERSON_IDS.jordan)]);
    expect(d.amount.chip).toEqual({ label: "Overdue 1 day", tone: "danger" });
    expect(labels(d)).toEqual(["Nudge", "Mark paid"]);
  });

  it("overdue before the monthly message: Mark paid only, as on Home", () => {
    const d = details(JORDAN_RENT, "2026-11-02");
    expect(d.amount.chip.tone).toBe("danger");
    expect(d.activity).toEqual([]);
    expect(labels(d)).toEqual(["Mark paid"]);
  });

  it("unsent: Not sent, no activity, and Mark paid before the message", () => {
    const d = details(JORDAN_UTILITIES, "2026-11-02", [], "unsent", true);
    expect(d.amount.chip).toEqual({ label: "Not sent", tone: "primary" });
    expect(d.activity).toEqual([]);
    expect(labels(d)).toEqual(["Mark paid"]);
  });

  it("dueToday: Due today with the payment check note while the month is collecting", () => {
    const d = details(JORDAN_UTILITIES, "2026-11-04", [monthly(PERSON_IDS.jordan)]);
    expect(d.amount).toEqual({
      value: "$82.46",
      chip: { label: "Due today", tone: "info" },
      note: "You’ll get a payment check tonight if it’s still unpaid.",
    });
    expect(d.activity).toEqual([{ title: "Monthly message sent", date: "02 Nov 2026" }]);
    expect(labels(d)).toEqual(["Mark paid"]);
  });

  it("dueToday outside collecting: no note, as on Home", () => {
    expect(details(JORDAN_RENT, "2026-11-01", [], "unsent").amount.note).toBeNull();
  });

  it("dueSoon: Due tomorrow", () => {
    const d = details(JORDAN_UTILITIES, "2026-11-03", [monthly(PERSON_IDS.jordan)]);
    expect(d.amount.chip).toEqual({ label: "Due tomorrow", tone: "info" });
    expect(labels(d)).toEqual(["Mark paid"]);
  });

  it("sentUnpaid and upcoming: Sent · unpaid once the payer's message is out, else Upcoming", () => {
    expect(details(PRIYA_RENT, "2026-11-02", [monthly(PERSON_IDS.priya)]).amount.chip).toEqual({
      label: "Sent · unpaid",
      tone: "neutral",
    });
    const upcoming = details(PRIYA_RENT, "2026-11-02");
    expect(upcoming.amount.chip).toEqual({ label: "Upcoming", tone: "neutral" });
    expect(upcoming.activity).toEqual([]);
  });

  it("routed: Via the payer, the payer's due day and message, and Mark paid only even when overdue", () => {
    const sent = details(SAM_UTILITIES, "2026-11-02", [monthly(PERSON_IDS.priya), monthly(PERSON_IDS.jordan)]);
    expect(sent.title).toBe("Utilities · Sam");
    expect(sent.facts.slice(0, 3)).toEqual([
      { kind: "text", label: "Payer", value: "Sam" },
      { kind: "text", label: "Payment routing", value: "Via Priya" },
      { kind: "text", label: "Due", value: "07 Nov 2026" },
    ]);
    expect(sent.amount.chip).toEqual({ label: "Sent · unpaid", tone: "neutral" });
    expect(sent.activity).toEqual([{ title: "Monthly message sent", date: "02 Nov 2026" }]);
    expect(labels(sent)).toEqual(["Mark paid"]);

    const late = details(SAM_UTILITIES, "2026-11-20", [monthly(PERSON_IDS.priya)]);
    expect(late.amount.chip.tone).toBe("danger");
    expect(labels(late)).toEqual(["Mark paid"]);
  });

  it("paid: Paid chip and pill, the payment on top of the same-day order, and Edit payment", () => {
    const paid = { ...JORDAN_RENT, paidCents: 95000, paidOn: new Date("2026-11-03") };
    const d = details(paid, "2026-11-05", [monthly(PERSON_IDS.jordan), nudge(JORDAN_RENT.id)]);
    expect(d.amount.chip).toEqual({ label: "Paid", tone: "success" });
    expect(d.facts[3]).toEqual({ kind: "pill", label: "Payment status", badge: { label: "Paid", tone: "success" } });
    expect(d.activity).toEqual([
      { title: "Payment $950.00", date: "03 Nov 2026" },
      { title: "Nudged", date: "02 Nov 2026" },
      { title: "Monthly message sent", date: "02 Nov 2026" },
    ]);
    expect(d.footer).toEqual([
      { label: "Edit payment", tone: "outline", icon: "pencil", target: { kind: "edit-payment", chargeId: JORDAN_RENT.id } },
    ]);
  });

  it("paid via someone: Edit payment too", () => {
    const paid = { ...SAM_UTILITIES, paidCents: 8246, paidOn: new Date("2026-11-07") };
    expect(labels(details(paid, "2026-11-08"))).toEqual(["Edit payment"]);
  });

  it("gives a paid refund (a charge below zero) no Edit payment, only Delete correction", () => {
    const refund = charge({ id: "charge-7", category: "CORRECTION", label: "Correction", amountCents: -500, paidCents: -500, paidOn: new Date("2026-11-03"), dueDate: null });
    expect(labels(details(refund, "2026-11-05"))).toEqual(["Delete correction"]);
  });

  it("lists a payment made the same day as a nudge above it", () => {
    const paid = { ...JORDAN_RENT, paidCents: 95000, paidOn: new Date("2026-11-02") };
    const d = details(paid, "2026-11-05", [monthly(PERSON_IDS.jordan), nudge(JORDAN_RENT.id)]);
    expect(d.activity.map((a) => a.title)).toEqual(["Payment $950.00", "Nudged", "Monthly message sent"]);
  });

  it("only counts the payer's monthly messages and this charge's nudges", () => {
    const d = details(JORDAN_RENT, "2026-11-03", [monthly(PERSON_IDS.priya), nudge("another-charge")]);
    expect(d.activity).toEqual([]);
  });

  it("leaves Due out when no due day is known", () => {
    const correction = charge({ id: "charge-5", category: "CORRECTION", label: "Correction", dueDate: null });
    expect(details(correction, "2026-11-03").facts.map((f) => f.label)).toEqual(["Payer", "Payment routing", "Payment status"]);
  });

  it("gives the owner's own charge no footer", () => {
    const own = charge({ id: "charge-6", personId: PERSON_IDS.alex, dueDate: new Date("2026-11-01") });
    expect(details(own, "2026-11-03").footer).toEqual([]);
    // Even if a payment were stored on it, the owner's charge never gets Edit payment.
    const ownPaid = { ...own, paidCents: 95000, paidOn: new Date("2026-11-02") };
    expect(details(ownPaid, "2026-11-03").footer).toEqual([]);
  });
});

describe("buildChargeDetails: corrections", () => {
  const OCT_UTILITIES = { label: "Utilities", month: "2026-10" };
  const paidUtilities = { ...JORDAN_UTILITIES, month: "2026-10", dueDate: new Date("2026-10-04"), paidCents: 8246, paidOn: new Date("2026-10-06") };
  const correction = (amountCents: number, paid: boolean) =>
    charge({
      id: "correction-1",
      category: "CORRECTION",
      label: "Utilities correction (Oct)",
      amountCents,
      dueDate: new Date("2026-11-24"),
      paidCents: paid ? amountCents : null,
      paidOn: paid ? new Date("2026-11-21") : null,
    });

  it("paidCorrectable: Edit payment, then Add correction", () => {
    const d = details(paidUtilities, "2026-11-21", [], "collecting", false, { canCorrect: true });
    expect(d.footer).toEqual([
      { label: "Edit payment", tone: "outline", icon: "pencil", target: { kind: "edit-payment", chargeId: "charge-2" } },
      { label: "Add correction", tone: "outline", icon: "plus", target: { kind: "add-correction", chargeId: "charge-2" } },
    ]);
    expect(d.deleteCorrection).toBeNull();
  });

  it("offers no Add correction when the charge can't be corrected", () => {
    expect(labels(details(paidUtilities, "2026-11-21"))).toEqual(["Edit payment"]);
  });

  it("corrected: the card note and the correction in the Activity, newest first; the stored amount stays", () => {
    const d = details(paidUtilities, "2026-11-21", [], "collecting", false, {
      canCorrect: true,
      corrections: [{ amountCents: -500, createdAt: new Date("2026-11-21T10:00:00+08:00") }],
    });
    expect(d.amount).toMatchObject({ value: "$82.46", chip: { label: "Paid" }, note: "Corrected to $77.46 · 1 correction" });
    expect(d.activity).toEqual([
      { title: "Correction -$5.00", date: "21 Nov 2026" },
      { title: "Payment $82.46", date: "06 Oct 2026" },
    ]);
  });

  it("counts every correction in the card note", () => {
    const corrections = [
      { amountCents: -500, createdAt: new Date("2026-11-21T10:00:00+08:00") },
      { amountCents: 200, createdAt: new Date("2026-11-22T10:00:00+08:00") },
    ];
    expect(details(paidUtilities, "2026-11-22", [], "collecting", false, { corrections }).amount.note).toBe(
      "Corrected to $79.46 · 2 corrections",
    );
  });

  it("correctionRefund: Refunded, what it fixes, no Due, only its refund in the Activity, and Delete correction", () => {
    const d = details(correction(-500, true), "2026-11-21", [monthly(PERSON_IDS.jordan)], "collecting", false, { fixes: OCT_UTILITIES });
    expect(d).toMatchObject({
      title: "Correction · Jordan",
      amount: { value: "-$5.00", chip: { label: "Refunded", tone: "success" }, note: null },
      facts: [
        { kind: "text", label: "Payer", value: "Jordan" },
        { kind: "text", label: "Payment routing", value: "Direct" },
        { kind: "text", label: "Fixes", value: "Utilities · Oct 2026" },
        { kind: "pill", label: "Payment status", badge: { label: "Refunded 21 Nov", tone: "success" } },
      ],
      activity: [{ title: "Refund -$5.00", date: "21 Nov 2026" }],
      footer: [
        { label: "Delete correction", tone: "outline-danger", icon: "trash", target: { kind: "delete-correction", chargeId: "correction-1" } },
      ],
      deleteCorrection: {
        title: "Delete this correction?",
        body: "It’s removed from Utilities · Jordan and from History. Its payment is removed too.",
        confirmLabel: "Delete",
        cancelLabel: "Keep",
      },
    });
  });

  it("correctionUnpaid: its chip and Due, Mark paid, then Delete correction", () => {
    const d = details(correction(500, false), "2026-11-21", [], "collecting", true, { fixes: OCT_UTILITIES });
    expect(d.amount.chip).toEqual({ label: "Not sent", tone: "primary" });
    expect(d.facts.map((f) => f.label)).toEqual(["Payer", "Payment routing", "Fixes", "Due", "Payment status"]);
    expect(labels(d)).toEqual(["Mark paid", "Delete correction"]);
    expect(d.deleteCorrection?.body).toBe("It’s removed from Utilities · Jordan and from History.");
  });

  it("correctionPaid: Edit payment, then Delete correction, never Add correction", () => {
    const d = details(correction(500, true), "2026-11-25", [], "collecting", false, { fixes: OCT_UTILITIES, canCorrect: true });
    expect(labels(d)).toEqual(["Edit payment", "Delete correction"]);
    expect(d.deleteCorrection?.body).toMatch(/Its payment is removed too.$/);
  });

  it("gives the owner's own correction no footer and no dialog", () => {
    const own = { ...correction(-500, true), personId: PERSON_IDS.alex };
    const d = details(own, "2026-11-21", [], "collecting", false, { fixes: OCT_UTILITIES });
    expect(d.footer).toEqual([]);
    expect(d.deleteCorrection).toBeNull();
  });
});
