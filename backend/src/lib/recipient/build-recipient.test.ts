import { recipientResponseSchema } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildRecipient, recipientSubLine, type RecipientChargeRow, type RecipientInput } from "./build-recipient";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];
const NAMES = new Map(PEOPLE.map((p) => [p.id, p.name]));

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
    person: { id: personId, name: NAMES.get(personId)! },
    people: PEOPLE,
    billCents: 41230,
    charges,
    messages: [],
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
    expect(r.message.sections).toEqual([
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
    expect(r.message.text).toContain("*Yours:*\nRent $1,675.00");
    expect(r.note).toBeNull();
    expect(r.primaryAction).toEqual({
      label: "Send on WhatsApp",
      icon: "send",
      enabled: true,
      target: { kind: "send-whatsapp", month: "2026-11", personId: priya },
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
    expect(r.message.sections).toHaveLength(1);
    expect(r.message.sections[0].title).toBeNull();
  });

  it("says overdue in danger once the earliest due date has passed", () => {
    const r = buildRecipient(input(jordan, JORDAN_CHARGES, { today: "2026-11-02" }));

    expect(r.amountCard.statusLine).toEqual({ text: "Overdue since 1 Nov", tone: "danger" });
  });

  it("builds a page for someone paying only rent directly", () => {
    const r = buildRecipient(input(sam, SAM_CHARGES));

    expect(r.header.sub).toBe("Own room · utilities and aircon via Priya");
    expect(r.amountCard).toMatchObject({ amount: "$950.00", statusLine: { text: "Due 28 Nov", tone: "default" } });
    expect(r.message.sections).toEqual([{ title: null, lines: [{ label: "Rent", amount: "$950.00" }], subtotal: null }]);
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
    expect(r.message.sections[0].lines).toEqual([{ label: "Rent", amount: "$950.00" }]);
    expect(r.primaryAction?.enabled).toBe(false);
    expect(r.secondaryActions.map((a) => a.enabled)).toEqual([false]);
  });

  it("includes an earlier month's unpaid correction in the message", () => {
    const correction = charge(jordan, "CORRECTION", "Correction: September utilities", 1500, null, { month: "2026-10" });
    const r = buildRecipient(input(jordan, [...JORDAN_CHARGES, correction]));

    expect(r.amountCard.amount).toBe("$1,065.79");
    expect(r.message.sections[0].lines.at(-1)).toEqual({ label: "Correction: September utilities", amount: "$15.00" });
  });
});
