import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildBreakdown, type BreakdownCharge, type BreakdownInput } from "./build-breakdown";

const { alex, priya, sam, jordan } = PERSON_IDS;

const PEOPLE = [
  { id: alex, name: "Alex" },
  { id: priya, name: "Priya" },
  { id: sam, name: "Sam" },
  { id: jordan, name: "Jordan" },
];

/** An unpaid November charge. */
function charge(
  personId: string,
  category: BreakdownCharge["category"],
  label: string,
  amountCents: number,
  dueDate: string | null,
  extra: Partial<BreakdownCharge> = {},
): BreakdownCharge {
  return {
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

// November from the Data Model fixtures, with the $412.30 bill saved.
const NOV_CHARGES: BreakdownCharge[] = [
  charge(alex, "RENT", "Rent", 167500, null),
  charge(alex, "UTILITIES", "Utilities", 12369, null),
  charge(priya, "RENT", "Rent", 167500, "2026-11-07"),
  charge(priya, "UTILITIES", "Utilities", 12369, "2026-11-07"),
  charge(priya, "AIRCON", "Aircon", 3667, "2026-11-07"),
  charge(priya, "RECURRING", "Starhub", 2750, "2026-11-07"),
  charge(sam, "UTILITIES", "Utilities", 8246, null, { payViaPersonId: priya }),
  charge(sam, "AIRCON", "Aircon", 1833, null, { payViaPersonId: priya }),
  charge(sam, "RENT", "Rent", 95000, "2026-11-28"),
  charge(jordan, "RENT", "Rent", 95000, "2026-11-01"),
  charge(jordan, "UTILITIES", "Utilities", 8246, "2026-11-04"),
  charge(jordan, "AIRCON", "Aircon", 1833, "2026-11-04"),
];

function input(recipientId: string, overrides: Partial<BreakdownInput> = {}): BreakdownInput {
  return {
    month: "2026-11",
    recipientId,
    config: NOV_2026_CONFIG,
    billCents: 41230,
    people: PEOPLE,
    charges: NOV_CHARGES,
    ...overrides,
  };
}

describe("buildBreakdown", () => {
  it("gives the primary tenant their section and Sam's, titled, with subtotals", () => {
    const b = buildBreakdown(input(priya));

    expect(b.sections.map((s) => [s.title, s.subtotal])).toEqual([
      ["Yours:", "$1,862.86"],
      ["Sam’s (please collect):", "$100.79"],
    ]);
    expect(b.totalCents).toBe(196365);
    expect(b.dueDate).toBe("2026-11-07");
    // The bill's total shows on every utilities line, Sam's too.
    expect(b.text).toBe(
      [
        "Yours:",
        "*Rent:* $1,675.00",
        "*Utilities bill:* $123.69 (total bill $412.30)",
        "*Aircon servicing:* $36.67 (2/6 units)",
        "*Starhub:* $27.50",
        "*Subtotal:* $1,862.86",
        "",
        "Sam’s (please collect):",
        "*Utilities bill:* $82.46 (total bill $412.30)",
        "*Aircon servicing:* $18.33 (1/6 units)",
        "*Subtotal:* $100.79",
      ].join("\n"),
    );
  });

  it("uses the config's custom section titles, adding the colon", () => {
    const config = {
      ...NOV_2026_CONFIG,
      templates: {
        ...NOV_2026_CONFIG.templates,
        sectionTitles: { [priya]: "Master Bedroom Share", [sam]: "Common Room 1" },
      },
    };
    const b = buildBreakdown(input(priya, { config }));

    expect(b.sections.map((s) => s.title)).toEqual(["Master Bedroom Share:", "Common Room 1:"]);
    expect(b.text.split("\n")).toContain("Common Room 1:");
  });

  it("gives a person with no one paying through them one untitled section", () => {
    const b = buildBreakdown(input(jordan));

    expect(b.sections).toHaveLength(1);
    expect(b.sections[0]).toMatchObject({ title: null, subtotal: null, subtotalCents: 105079 });
    expect(b.totalCents).toBe(105079);
    expect(b.dueDate).toBe("2026-11-01");
    expect(b.text).toBe(
      [
        "*Rent:* $950.00",
        "*Utilities bill:* $82.46 (total bill $412.30)",
        "*Aircon servicing:* $18.33 (1/6 units)",
      ].join("\n"),
    );
  });

  it("leaves paid charges out of the lines, the total and the due date", () => {
    const charges = NOV_CHARGES.map((c) =>
      c.personId === jordan && c.category === "RENT" ? { ...c, paidCents: 95000 } : c,
    );
    const b = buildBreakdown(input(jordan, { charges }));

    expect(b.sections[0].lines.map((l) => l.label)).toEqual(["Utilities bill", "Aircon servicing"]);
    expect(b.totalCents).toBe(10079);
    expect(b.dueDate).toBe("2026-11-04");
  });

  it("adds unpaid corrections from earlier months last, and a credit as a negative line", () => {
    const charges = [
      ...NOV_CHARGES,
      charge(jordan, "CORRECTION", "Correction: September utilities", 1500, null, { month: "2026-10" }),
      charge(jordan, "CORRECTION", "Correction: August utilities", -500, null, { month: "2026-09" }),
      // Paid, so left out.
      charge(jordan, "CORRECTION", "Correction: July utilities", 700, null, { month: "2026-08", paidCents: 700 }),
      // An earlier month's unpaid rent is not a correction, so it stays out of the message.
      charge(jordan, "RENT", "Rent", 95000, "2026-10-01", { month: "2026-10" }),
      // A later month is never in this one's message.
      charge(jordan, "RENT", "Rent", 95000, "2026-12-01", { month: "2026-12" }),
    ];
    const b = buildBreakdown(input(jordan, { charges }));

    // An earlier month's correction has no working.
    expect(b.sections[0].lines.map((l) => [l.label, l.amount, l.working])).toEqual([
      ["Rent", "$950.00", null],
      ["Utilities bill", "$82.46", "(total bill $412.30)"],
      ["Aircon servicing", "$18.33", "(1/6 units)"],
      ["Correction: August utilities", "-$5.00", null],
      ["Correction: September utilities", "$15.00", null],
    ]);
    expect(b.totalCents).toBe(105079 + 1500 - 500);
    expect(b.dueDate).toBe("2026-11-01");
  });

  it("keeps charges paid through someone out of the owing person's own message", () => {
    const b = buildBreakdown(input(sam));

    expect(b.sections).toHaveLength(1);
    expect(b.sections[0].lines.map((l) => l.label)).toEqual(["Rent"]);
    expect(b.totalCents).toBe(95000);
    expect(b.dueDate).toBe("2026-11-28");
  });

  it("titles a lone section when it belongs to someone paying through the recipient", () => {
    const charges = NOV_CHARGES.map((c) => (c.personId === priya ? { ...c, paidCents: c.amountCents } : c));
    const b = buildBreakdown(input(priya, { charges }));

    expect(b.sections.map((s) => [s.title, s.subtotal])).toEqual([["Sam’s (please collect):", "$100.79"]]);
    expect(b.sections[0].lines[0]).toMatchObject({ label: "Utilities bill", working: "(total bill $412.30)" });
    // Sam's utilities have no due date of their own, so Priya's due day is used.
    expect(b.dueDate).toBe("2026-11-07");
  });

  it("shows no utilities working without a saved bill", () => {
    const b = buildBreakdown(input(jordan, { billCents: null }));

    expect(b.sections[0].lines[1]).toMatchObject({ label: "Utilities bill", working: null });
    expect(b.text.split("\n")[1]).toBe("*Utilities bill:* $82.46");
  });

  it("uses the config's custom line labels", () => {
    const config = {
      ...NOV_2026_CONFIG,
      templates: { ...NOV_2026_CONFIG.templates, lineLabels: { UTILITIES: "Kuryente at tubig", RENT: "Upa" } },
    };
    const b = buildBreakdown(input(jordan, { config }));

    expect(b.sections[0].lines.map((l) => l.label)).toEqual(["Upa", "Kuryente at tubig", "Aircon servicing"]);
  });

  it("is empty when nothing is unpaid", () => {
    const charges = NOV_CHARGES.map((c) => ({ ...c, paidCents: c.amountCents }));
    const b = buildBreakdown(input(jordan, { charges }));

    expect(b).toEqual({ sections: [], totalCents: 0, dueDate: null, text: "" });
  });
});
