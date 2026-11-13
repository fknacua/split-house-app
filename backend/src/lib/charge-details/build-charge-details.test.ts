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

/** Builds the details and checks them against the shared contract. */
function details(
  c: ChargeDetailsCharge,
  today: string,
  messages: ChargeDetailsMessage[] = [],
  monthStatus: HomeStatus = "collecting",
) {
  const input: ChargeDetailsInput = { today, config: NOV_2026_CONFIG, charge: c, people: PEOPLE, messages, monthStatus };
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
          target: { kind: "recipient", month: "2026-11", personId: PERSON_IDS.jordan, chargeId: JORDAN_RENT.id },
        },
        { label: "Mark paid", tone: "outline", icon: "check", target: { kind: "mark-paid", chargeId: JORDAN_RENT.id } },
      ],
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
    const d = details(JORDAN_UTILITIES, "2026-11-02", [], "unsent");
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

  it("paid: Paid chip and pill, the payment on top of the same-day order, no footer", () => {
    const paid = { ...JORDAN_RENT, paidCents: 95000, paidOn: new Date("2026-11-03") };
    const d = details(paid, "2026-11-05", [monthly(PERSON_IDS.jordan), nudge(JORDAN_RENT.id)]);
    expect(d.amount.chip).toEqual({ label: "Paid", tone: "success" });
    expect(d.facts[3]).toEqual({ kind: "pill", label: "Payment status", badge: { label: "Paid", tone: "success" } });
    expect(d.activity).toEqual([
      { title: "Payment $950.00", date: "03 Nov 2026" },
      { title: "Nudged", date: "02 Nov 2026" },
      { title: "Monthly message sent", date: "02 Nov 2026" },
    ]);
    expect(d.footer).toEqual([]);
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
  });
});
