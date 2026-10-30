import { recipientResponseSchema, type RecipientResponse } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { whatsappLink } from "@/lib/messages/whatsapp-link";
import { buildRecipient, recipientSubLine, type RecipientChargeRow, type RecipientInput } from "./build-recipient";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];
const NAMES = new Map<string, string>(PEOPLE.map((p) => [p.id, p.name]));
const PHONE = "+6580000000";

/** The message card, failing the test with a clear error when the layout has none (the paid layouts). */
function messageOf(r: RecipientResponse): NonNullable<RecipientResponse["message"]> {
  if (!r.message) throw new Error("expected a message");
  return r.message;
}

/** An unpaid November charge. */
function charge(
  personId: string,
  category: RecipientChargeRow["category"],
  label: string,
  amountCents: number,
  dueDate: string | null,
  extra: Partial<RecipientChargeRow> = {},
): RecipientChargeRow {
  return {
    id: `${personId}-${category}`,
    personId,
    month: "2026-11",
    category,
    label,
    amountCents,
    dueDate: dueDate ? new Date(`${dueDate}T00:00:00+08:00`) : null,
    payViaPersonId: null,
    paidCents: null,
    paidOn: null,
    ...extra,
  };
}

// November from the Data Model fixtures, with the $412.30 bill saved: what each payer's query returns.
const PRIYA_CHARGES = [
  charge(priya, "RENT", "Rent", 167500, "2026-11-07"),
  charge(priya, "UTILITIES", "Utilities", 12369, "2026-11-07"),
  charge(priya, "AIRCON", "Aircon", 3667, "2026-11-07"),
  charge(priya, "RECURRING", "Starhub", 2750, "2026-11-07"),
  charge(sam, "UTILITIES", "Utilities", 8246, null, { payViaPersonId: priya }),
  charge(sam, "AIRCON", "Aircon", 1833, null, { payViaPersonId: priya }),
];
const JORDAN_CHARGES = [
  charge(jordan, "RENT", "Rent", 95000, "2026-11-01"),
  charge(jordan, "UTILITIES", "Utilities", 8246, "2026-11-04"),
  charge(jordan, "AIRCON", "Aircon", 1833, "2026-11-04"),
];
const SAM_CHARGES = [charge(sam, "RENT", "Rent", 95000, "2026-11-28")];

function input(personId: string, charges: RecipientChargeRow[], overrides: Partial<RecipientInput> = {}): RecipientInput {
  return {
    month: "2026-11",
    today: "2026-11-01",
    config: NOV_2026_CONFIG,
    person: { id: personId, name: NAMES.get(personId)!, whatsappE164: PHONE },
    people: PEOPLE,
    billCents: 41230,
    charges,
    messages: [],
    paymentsEditable: true,
    ...overrides,
  };
}

describe("recipientSubLine", () => {
  it("reads the room from the role and the routes", () => {
    expect(recipientSubLine(NOV_2026_CONFIG, priya, NAMES)).toBe("Master room · pays you directly");
    expect(recipientSubLine(NOV_2026_CONFIG, sam, NAMES)).toBe("Own room · utilities and aircon via Priya");
    expect(recipientSubLine(NOV_2026_CONFIG, jordan, NAMES)).toBe("Own room · pays you directly");
  });
});

describe("buildRecipient: notSent", () => {
  it("builds the primary tenant's page as on the board", () => {
    const r = buildRecipient(input(priya, PRIYA_CHARGES));

    expect(() => recipientResponseSchema.parse(r)).not.toThrow();
    expect(r.header).toEqual({ name: "Priya", sub: "Master room · pays you directly" });
    expect(r.amountCard).toEqual({
      label: "Nov 2026 total",
      amount: "$1,963.65",
      chip: { label: "Not sent", tone: "primary" },
      statusLine: { text: "Due 7 Nov · includes Sam’s share", tone: "default" },
    });
    expect(r.charges).toEqual([]);
    expect(r.message).toMatchObject({
      label: "Message",
      meta: "Monthly breakdown template",
      intro: "Hi Priya! Eto na yung breakdown for Nov 2026 😊",
      outro: [
        { text: "Total: $1,963.65", isTotal: true },
        { text: "Paki-send by 7 Nov. Salamat!", isTotal: false },
      ],
      editTemplate: { label: "Edit template", enabled: true, target: { kind: "edit-template", template: "MONTHLY" } },
    });
    expect(messageOf(r).sections).toEqual([
      {
        title: "Yours:",
        lines: [
          { label: "Rent", amount: "$1,675.00" },
          { label: "Utilities bill (1.5 of 5 shares of $412.30)", amount: "$123.69" },
          { label: "Aircon servicing (2 of 6 units)", amount: "$36.67" },
          { label: "Starhub", amount: "$27.50" },
        ],
        subtotal: "$1,862.86",
      },
      {
        title: "Sam’s (please collect):",
        lines: [
          { label: "Utilities bill (1 of 5 shares)", amount: "$82.46" },
          { label: "Aircon servicing (1 of 6 units)", amount: "$18.33" },
        ],
        subtotal: "$100.79",
      },
    ]);
    expect(messageOf(r).text).toContain("Yours:\nRent $1,675.00");
    expect(messageOf(r).text).toContain("*Subtotal $1,862.86*");
    expect(messageOf(r).text).toContain("*Total: $1,963.65*");
    expect(r.note).toBeNull();
    expect(r.primaryAction).toEqual({
      label: "Send on WhatsApp",
      icon: "send",
      enabled: true,
      target: { kind: "send-whatsapp", month: "2026-11", personId: priya, url: whatsappLink(PHONE, messageOf(r).text) },
    });
    expect(r.secondaryActions).toEqual([
      { label: "Share bill", icon: null, enabled: true, target: { kind: "share-bill", month: "2026-11" } },
    ]);
  });

  it("gives a tenant paying alone one untitled section and their earliest due date", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES));

    expect(r.header.sub).toBe("Own room · pays you directly");
    expect(r.amountCard).toMatchObject({
      amount: "$1,050.79",
      statusLine: { text: "Due 1 Nov", tone: "default" },
    });
    expect(messageOf(r).sections).toHaveLength(1);
    expect(messageOf(r).sections[0].title).toBeNull();
  });

  it("says overdue in danger once the earliest due date has passed", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-02" }));

    expect(r.amountCard.statusLine).toEqual({ text: "Overdue since 1 Nov", tone: "danger" });
  });

  it("builds a page for someone paying only rent directly", () => {
    const r = buildRecipient(input(sam, SAM_CHARGES));

    expect(r.header.sub).toBe("Own room · utilities and aircon via Priya");
    expect(r.amountCard).toMatchObject({ amount: "$950.00", statusLine: { text: "Due 28 Nov", tone: "default" } });
    expect(messageOf(r).sections).toEqual([{ title: null, lines: [{ label: "Rent", amount: "$950.00" }], subtotal: null }]);
    expect(r.primaryAction?.enabled).toBe(true);
  });

  it("previews the charges so far before the bill, with Send and Share bill disabled", () => {
    const r = buildRecipient(input(jordan, [JORDAN_CHARGES[0]], { billCents: null }));

    expect(r.amountCard).toEqual({
      label: "Nov 2026 so far",
      amount: "$950.00",
      chip: { label: "Needs bill", tone: "neutral" },
      statusLine: { text: "Utilities are worked out once the bill is uploaded", tone: "default" },
    });
    expect(messageOf(r).sections[0].lines).toEqual([{ label: "Rent", amount: "$950.00" }]);
    expect(r.primaryAction?.enabled).toBe(false);
    expect(r.secondaryActions.map((a) => a.enabled)).toEqual([false]);
  });

  it("includes an earlier month's unpaid correction in the message", () => {
    const correction = charge(jordan, "CORRECTION", "Correction: September utilities", 1500, null, { month: "2026-10" });
    const r = buildRecipient(input(jordan, [...JORDAN_CHARGES, correction]));

    expect(r.amountCard.amount).toBe("$1,065.79");
    expect(messageOf(r).sections[0].lines.at(-1)).toEqual({ label: "Correction: September utilities", amount: "$15.00" });
  });
});

describe("buildRecipient: Send on WhatsApp", () => {
  it("disables Send and says why when the person has no WhatsApp number", () => {
    const r = buildRecipient(input(priya, PRIYA_CHARGES, { person: { id: priya, name: "Priya", whatsappE164: null } }));

    expect(r.primaryAction).toMatchObject({ enabled: false, target: { kind: "send-whatsapp", url: null } });
    expect(r.secondaryActions[0].enabled).toBe(true);
    expect(r.note).toBe("No WhatsApp number is set up for Priya.");
  });

  it("disables Send again and says why once sent, if the number was removed", () => {
    const r = buildRecipient(
      input(priya, PRIYA_CHARGES, {
        person: { id: priya, name: "Priya", whatsappE164: null },
        messages: [{ kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-01T09:00:00+08:00") }],
      }),
    );

    expect(r.secondaryActions.map((a) => [a.label, a.enabled])).toEqual([
      ["Share bill", true],
      ["Send again", false],
    ]);
    expect(r.note).toBe("No WhatsApp number is set up for Priya.");
  });
});

describe("buildRecipient: sent", () => {
  const sentOn = (openedAt: string) => ({ kind: "MONTHLY" as const, chargeId: null, openedAt: new Date(openedAt) });

  it("builds the primary tenant's page as on the board", () => {
    const r = buildRecipient(
      input(priya, PRIYA_CHARGES, { today: "2026-11-03", messages: [sentOn("2026-11-02T10:00:00+08:00")] }),
    );

    expect(() => recipientResponseSchema.parse(r)).not.toThrow();
    expect(r.amountCard).toEqual({
      label: "Nov 2026 total",
      amount: "$1,963.65",
      chip: { label: "Sent · unpaid", tone: "neutral" },
      statusLine: { text: "Sent 2 Nov · due 7 Nov", tone: "default" },
    });
    expect(r.message).toMatchObject({ label: "Sent message", meta: "Sent 2 Nov" });
    expect(messageOf(r).sections).toHaveLength(2);
    expect(r.primaryAction).toEqual({
      label: "Mark paid",
      icon: "check",
      enabled: true,
      target: { kind: "record-payment", month: "2026-11", personId: priya },
    });
    expect(r.secondaryActions).toEqual([
      { label: "Share bill", icon: null, enabled: true, target: { kind: "share-bill", month: "2026-11" } },
      {
        label: "Send again",
        icon: null,
        enabled: true,
        target: { kind: "send-whatsapp", month: "2026-11", personId: priya, url: whatsappLink(PHONE, messageOf(r).text) },
      },
    ]);
  });

  it("dates it by the latest monthly message in Singapore, ignoring nudges", () => {
    const r = buildRecipient(
      input(priya, PRIYA_CHARGES, {
        today: "2026-11-05",
        messages: [
          sentOn("2026-11-02T10:00:00+08:00"),
          sentOn("2026-11-03T16:30:00Z"), // 4 Nov 00:30 in Singapore
          { kind: "NUDGE", chargeId: "priya-RENT", openedAt: new Date("2026-11-05T09:00:00+08:00") },
        ],
      }),
    );

    expect(r.amountCard.statusLine?.text).toBe("Sent 4 Nov · due 7 Nov");
    expect(messageOf(r).meta).toBe("Sent 4 Nov");
  });

  it("stays notSent with only a nudge", () => {
    const r = buildRecipient(
      input(jordan, JORDAN_CHARGES, {
        messages: [{ kind: "NUDGE", chargeId: "jordan-RENT", openedAt: new Date("2026-11-01T09:00:00+08:00") }],
      }),
    );

    expect(r.amountCard.chip.label).toBe("Not sent");
  });

});

describe("buildRecipient: overdue (nudged)", () => {
  const sent = { kind: "MONTHLY" as const, chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") };
  const rentNudge = { kind: "NUDGE" as const, chargeId: `${jordan}-RENT`, openedAt: new Date("2026-11-02T18:00:00+08:00") };
  const RENT_NUDGE = "Hi Jordan! Paalala lang, yung Rent for Nov 2026 ($950.00) ay due nung 1 Nov. Salamat! 🙏";
  const nudgeTarget = (personId: string, chargeId: string, text: string) => ({
    kind: "nudge-whatsapp",
    month: "2026-11",
    personId,
    chargeId,
    url: whatsappLink(PHONE, text),
  });

  it("builds Jordan's page on 3 Nov as on the board, without the savings note", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-03", messages: [sent, rentNudge] }));

    expect(() => recipientResponseSchema.parse(r)).not.toThrow();
    expect(r.amountCard).toEqual({
      label: "Outstanding",
      amount: "$1,050.79",
      chip: { label: "Overdue", tone: "danger" },
      statusLine: { text: "Rent overdue since 1 Nov · nudged 2 Nov", tone: "danger" },
    });
    expect(r.charges).toEqual([
      {
        chargeId: `${jordan}-RENT`,
        title: "Rent",
        amount: "$950.00",
        detail: "Due 1 Nov · nudged 2 Nov",
        chip: { label: "Overdue 2 days", tone: "danger" },
        nudge: nudgeTarget(jordan, `${jordan}-RENT`, RENT_NUDGE),
      },
      {
        chargeId: `${jordan}-UTILITIES`,
        title: "Utilities",
        amount: "$82.46",
        detail: "Due 4 Nov · sent 2 Nov",
        chip: { label: "Due tomorrow", tone: "info" },
        nudge: null,
      },
      {
        chargeId: `${jordan}-AIRCON`,
        title: "Aircon",
        amount: "$18.33",
        detail: "Due 4 Nov · sent 2 Nov",
        chip: { label: "Due tomorrow", tone: "info" },
        nudge: null,
      },
    ]);
    expect(r.message).toEqual({
      label: "Last nudge",
      meta: "Sent 2 Nov",
      intro: RENT_NUDGE,
      sections: [],
      outro: [],
      text: RENT_NUDGE,
      editTemplate: { label: "Edit template", icon: null, enabled: true, target: { kind: "edit-template", template: "NUDGE" } },
    });
    expect(r.note).toBeNull();
    expect(r.primaryAction).toEqual({
      label: "Mark rent paid",
      icon: "check",
      enabled: true,
      target: { kind: "record-payment", month: "2026-11", personId: jordan, chargeId: `${jordan}-RENT` },
    });
    expect(r.secondaryActions).toEqual([
      { label: "Nudge again", icon: null, enabled: true, target: nudgeTarget(jordan, `${jordan}-RENT`, RENT_NUDGE) },
    ]);
  });

  it("previews the nudge and offers plain Nudge before any nudge", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-03", messages: [sent] }));

    expect(r.amountCard.statusLine).toEqual({ text: "Rent overdue since 1 Nov", tone: "danger" });
    expect(r.charges[0].detail).toBe("Due 1 Nov · sent 2 Nov");
    expect(r.message).toMatchObject({ label: "Nudge", meta: "Nudge template", text: RENT_NUDGE });
    expect(r.secondaryActions.map((a) => a.label)).toEqual(["Nudge"]);
  });

  it("stays notSent while the monthly message is not out, overdue or not", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-03", messages: [rentNudge] }));

    expect(r.amountCard.chip.label).toBe("Not sent");
    expect(r.charges).toEqual([]);
  });

  it("asks which charge to nudge when none was chosen and two are overdue", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-05", messages: [sent, rentNudge] }));

    expect(r.amountCard.statusLine?.text).toBe("Rent overdue since 1 Nov · nudged 2 Nov");
    expect(r.charges.map((c) => c.chip.label)).toEqual(["Overdue 4 days", "Overdue 1 day", "Overdue 1 day"]);
    expect(r.charges.every((c) => c.nudge !== null)).toBe(true);
    expect(r.primaryAction?.target).toMatchObject({ chargeId: `${jordan}-RENT` });
    expect(r.secondaryActions).toEqual([
      { label: "Nudge again", icon: null, enabled: true, target: { kind: "choose-nudge", month: "2026-11", personId: jordan } },
    ]);
  });

  it("uses the charge Home's Nudge chose", () => {
    const r = buildRecipient(
      input(jordan, JORDAN_CHARGES, { today: "2026-11-05", messages: [sent, rentNudge], chargeId: `${jordan}-UTILITIES` }),
    );
    const text = "Hi Jordan! Paalala lang, yung Utilities bill for Nov 2026 ($82.46) ay due nung 4 Nov. Salamat! 🙏";

    expect(r.amountCard.statusLine?.text).toBe("Utilities overdue since 4 Nov");
    expect(r.message).toMatchObject({ label: "Nudge", meta: "Nudge template", text });
    expect(r.primaryAction).toMatchObject({ label: "Mark utilities paid", target: { chargeId: `${jordan}-UTILITIES` } });
    expect(r.secondaryActions).toEqual([
      { label: "Nudge", icon: null, enabled: true, target: nudgeTarget(jordan, `${jordan}-UTILITIES`, text) },
    ]);
  });

  it("ignores a chosen charge that is not overdue", () => {
    const r = buildRecipient(
      input(jordan, JORDAN_CHARGES, { today: "2026-11-03", messages: [sent, rentNudge], chargeId: `${jordan}-UTILITIES` }),
    );

    expect(r.primaryAction?.target).toMatchObject({ chargeId: `${jordan}-RENT` });
    expect(r.secondaryActions[0].target.kind).toBe("nudge-whatsapp");
  });

  it("names whose charge it is when it is paid through the person", () => {
    const r = buildRecipient(
      input(priya, PRIYA_CHARGES, { today: "2026-11-08", messages: [sent], chargeId: `${sam}-UTILITIES` }),
    );

    expect(r.charges.map((c) => c.title)).toEqual(["Rent", "Starhub", "Utilities", "Utilities · Sam", "Aircon", "Aircon · Sam"]);
    expect(r.amountCard.statusLine?.text).toBe("Utilities · Sam overdue since 7 Nov");
    expect(r.primaryAction?.label).toBe("Mark Sam’s utilities paid");
  });

  it("disables Nudge and says why without a WhatsApp number", () => {
    const r = buildRecipient(
      input(jordan, JORDAN_CHARGES, {
        today: "2026-11-03",
        messages: [sent],
        person: { id: jordan, name: "Jordan", whatsappE164: null },
      }),
    );

    expect(r.note).toBe("No WhatsApp number is set up for Jordan.");
    expect(r.secondaryActions[0]).toMatchObject({ label: "Nudge", enabled: false, target: { url: null } });
    expect(r.charges[0].nudge?.url).toBeNull();
  });
});

describe("buildRecipient: paid and paidDifferent", () => {
  const sent = { kind: "MONTHLY" as const, chargeId: null, openedAt: new Date("2026-11-02T10:05:00+08:00") };
  const PAID_ON = new Date("2026-11-27");

  /** Priya's charges, each paid in full on 27 Nov, with her rent's amount changed when given. */
  function priyaPaid(rentPaidCents = 167500): RecipientChargeRow[] {
    return PRIYA_CHARGES.map((c) => ({
      ...c,
      paidCents: c.category === "RENT" && c.personId === priya ? rentPaidCents : c.amountCents,
      paidOn: PAID_ON,
    }));
  }

  it("builds `paid` as on the board, with no message and Edit payment over every charge", () => {
    const r = buildRecipient(input(priya, priyaPaid(), { today: "2026-11-29", messages: [sent] }));

    expect(() => recipientResponseSchema.parse(r)).not.toThrow();
    expect(r.amountCard).toEqual({
      label: "Nov 2026 total",
      amount: "$1,963.65",
      chip: { label: "Paid", tone: "success" },
      statusLine: { text: "Paid in full 27 Nov", tone: "default" },
    });
    expect(r.message).toBeNull();
    expect(r.allPaid).toEqual({ title: "All payments done", note: "Nothing left to send for November." });
    expect(r.note).toBeNull();
    expect(r.primaryAction).toBeNull();
    expect(r.secondaryActions).toHaveLength(1);
    const edit = r.secondaryActions[0];
    expect(edit.label).toBe("Edit payment");
    if (edit.target.kind !== "edit-payment") throw new Error("expected edit-payment");
    expect(edit.target.chargeId).toBe(`${priya}-RENT`);
    expect(edit.target.charges.map((c) => c.title)).toEqual([
      "Rent",
      "Starhub",
      "Utilities",
      "Utilities · Sam",
      "Aircon",
      "Aircon · Sam",
    ]);
    expect(edit.target.charges[0]).toEqual({
      chargeId: `${priya}-RENT`,
      title: "Rent",
      received: "$1,675.00",
      detail: "Paid 27 Nov",
    });
  });

  it("shows `paid` when everything was paid before any message went out", () => {
    const r = buildRecipient(input(priya, priyaPaid(), { today: "2026-11-29" }));

    expect(r.amountCard.chip.label).toBe("Paid");
    expect(r.message).toBeNull();
  });

  it("builds `paidDifferent` for a short payment as on the board", () => {
    const r = buildRecipient(input(priya, priyaPaid(161135), { today: "2026-11-29", messages: [sent] }));

    expect(() => recipientResponseSchema.parse(r)).not.toThrow();
    expect(r.amountCard).toEqual({
      label: "Received 27 Nov",
      amount: "$1,900.00",
      chip: { label: "Paid less", tone: "warning" },
      statusLine: { text: "$63.65 short of $1,963.65", tone: "warning" },
    });
    expect(r.message).toBeNull();
    expect(r.allPaid).toEqual({ title: "No messages to send", note: "Every charge for November has a payment." });
    expect(r.note).toBe("November stays $63.65 short until you edit the payment or add a correction.");
    expect(r.primaryAction).toEqual({
      label: "Add correction",
      icon: "plus",
      enabled: true,
      target: { kind: "add-correction", month: "2026-11", personId: priya },
    });
    expect(r.secondaryActions[0].target).toMatchObject({ kind: "edit-payment", chargeId: `${priya}-RENT` });
  });

  it("opens Edit payment on the charge that differs and words its gap", () => {
    const charges = priyaPaid().map((c) => (c.category === "RECURRING" ? { ...c, paidCents: 2000 } : c));
    const r = buildRecipient(input(priya, charges, { today: "2026-11-29" }));

    const target = r.secondaryActions[0].target;
    if (target.kind !== "edit-payment") throw new Error("expected edit-payment");
    expect(target.chargeId).toBe(`${priya}-RECURRING`);
    expect(target.charges[1]).toMatchObject({ title: "Starhub", received: "$20.00", detail: "Paid 27 Nov · $7.50 short" });
  });

  it("builds the overpayment as `Paid more` in the info tone", () => {
    const r = buildRecipient(input(priya, priyaPaid(169500), { today: "2026-11-29" }));

    expect(r.amountCard).toEqual({
      label: "Received 27 Nov",
      amount: "$1,983.65",
      chip: { label: "Paid more", tone: "info" },
      statusLine: { text: "$20.00 over $1,963.65", tone: "default" },
    });
    expect(r.note).toBe("The extra is recorded as received. Add a correction if it should count elsewhere.");
    expect(r.primaryAction?.label).toBe("Add correction");
  });

  it("leaves Edit payment out in an earlier month", () => {
    const paid = buildRecipient(input(priya, priyaPaid(), { today: "2026-12-02", paymentsEditable: false }));
    const short = buildRecipient(input(priya, priyaPaid(161135), { today: "2026-12-02", paymentsEditable: false }));

    expect(paid.primaryAction).toBeNull();
    expect(paid.secondaryActions).toEqual([]);
    expect(short.primaryAction?.label).toBe("Add correction");
    expect(short.secondaryActions).toEqual([]);
  });

  it("stays in the unpaid layouts while any charge is unpaid or before the bill", () => {
    const partly = priyaPaid().map((c) => (c.category === "AIRCON" ? { ...c, paidCents: null, paidOn: null } : c));
    const beforeBill = SAM_CHARGES.map((c) => ({ ...c, paidCents: c.amountCents, paidOn: PAID_ON }));

    expect(buildRecipient(input(priya, partly, { today: "2026-11-05", messages: [sent] })).amountCard.chip.label).toBe(
      "Sent · unpaid",
    );
    expect(buildRecipient(input(sam, beforeBill, { billCents: null })).amountCard.chip.label).toBe("Needs bill");
  });

  it("does not wait on an unpaid credit", () => {
    const credit = charge(priya, "CORRECTION", "Correction", -500, null);
    const r = buildRecipient(input(priya, [...priyaPaid(), credit], { today: "2026-11-29" }));

    expect(r.amountCard).toMatchObject({ amount: "$1,963.65", chip: { label: "Paid" } });
  });
});
