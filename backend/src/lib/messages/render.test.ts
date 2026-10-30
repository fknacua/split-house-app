import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { BreakdownCharge } from "./build-breakdown";
import { lineLabel } from "./line-label";
import { fillTemplate, renderMonthlyMessage, renderNudgeMessage, templateFor, type NudgeCharge } from "./render";

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

const NOV_CHARGES: BreakdownCharge[] = [
  charge(priya, "RENT", "Rent", 167500, "2026-11-07"),
  charge(priya, "UTILITIES", "Utilities", 12369, "2026-11-07"),
  charge(priya, "AIRCON", "Aircon", 3667, "2026-11-07"),
  charge(priya, "RECURRING", "Starhub", 2750, "2026-11-07"),
  charge(sam, "UTILITIES", "Utilities", 8246, null, { payViaPersonId: priya }),
  charge(sam, "AIRCON", "Aircon", 1833, null, { payViaPersonId: priya }),
  charge(jordan, "RENT", "Rent", 95000, "2026-11-01"),
  charge(jordan, "UTILITIES", "Utilities", 8246, "2026-11-04"),
  charge(jordan, "AIRCON", "Aircon", 1833, "2026-11-04"),
];

function monthly(recipientId: string, recipientName: string, config = NOV_2026_CONFIG) {
  return renderMonthlyMessage({
    month: "2026-11",
    recipientId,
    recipientName,
    config,
    billCents: 41230,
    people: PEOPLE,
    charges: NOV_CHARGES,
  });
}

function withOverride(personId: string, kind: "MONTHLY" | "NUDGE", text: string) {
  return {
    ...NOV_2026_CONFIG,
    templates: { ...NOV_2026_CONFIG.templates, overrides: [{ personId, kind, text }] },
  };
}

describe("fillTemplate", () => {
  it("fills the placeholders it has values for", () => {
    expect(fillTemplate("Hi {name}, {total} by {dueDate}", { name: "Jordan", total: "$950.00", dueDate: "1 Nov" })).toBe(
      "Hi Jordan, $950.00 by 1 Nov",
    );
  });

  it("leaves a placeholder with no value and an unknown word as typed", () => {
    expect(fillTemplate("{name} {charge} {nickname}", { name: "Jordan" })).toBe("Jordan {charge} {nickname}");
  });

  it("never fills the text it put in", () => {
    expect(fillTemplate("Hi {name}!", { name: "{total}", total: "$1.00" })).toBe("Hi {total}!");
  });
});

describe("templateFor", () => {
  it("uses the person's override for the kind, or the household's template", () => {
    const config = withOverride(jordan, "MONTHLY", "Hello {name}");

    expect(templateFor(config, jordan, "MONTHLY")).toBe("Hello {name}");
    expect(templateFor(config, jordan, "NUDGE")).toBe(NOV_2026_CONFIG.templates.nudge);
    expect(templateFor(config, priya, "MONTHLY")).toBe(NOV_2026_CONFIG.templates.monthly);
  });
});

describe("lineLabel", () => {
  it("keeps a recurring charge's own label even with a custom recurring label", () => {
    const config = {
      ...NOV_2026_CONFIG,
      templates: { ...NOV_2026_CONFIG.templates, lineLabels: { RECURRING: "Internet", AIRCON: "Aircon" } },
    };

    expect(lineLabel(config, { category: "RECURRING", label: "Starhub" })).toBe("Starhub");
    expect(lineLabel(config, { category: "AIRCON", label: "Aircon one-off" })).toBe("Aircon");
    expect(lineLabel(config, { category: "CORRECTION", label: "Correction: September utilities" })).toBe(
      "Correction: September utilities",
    );
  });
});

describe("renderMonthlyMessage", () => {
  it("renders the Brief's Tagalog default for the primary tenant", () => {
    const message = monthly(priya, "Priya");

    expect(message.text).toBe(
      [
        "Hi Priya! Eto na yung breakdown for Nov 2026 😊",
        "",
        "*Yours:*",
        "Rent $1,675.00",
        "Utilities bill (1.5 of 5 shares of $412.30) $123.69",
        "Aircon servicing (2 of 6 units) $36.67",
        "Starhub $27.50",
        "Subtotal $1,862.86",
        "",
        "*Sam’s (please collect):*",
        "Utilities bill (1 of 5 shares) $82.46",
        "Aircon servicing (1 of 6 units) $18.33",
        "Subtotal $100.79",
        "",
        "Total: $1,963.65",
        "Paki-send by 7 Nov. Salamat!",
      ].join("\n"),
    );
    expect(message.before).toBe("Hi Priya! Eto na yung breakdown for Nov 2026 😊");
    expect(message.after).toBe("Total: $1,963.65\nPaki-send by 7 Nov. Salamat!");
    expect(message.breakdown.totalCents).toBe(196365);
  });

  it("uses the earliest due date among the charges in it", () => {
    expect(monthly(jordan, "Jordan").text).toMatch(/Total: \$1,050\.79\nPaki-send by 1 Nov\. Salamat!$/);
  });

  it("uses the recipient's override", () => {
    const message = monthly(jordan, "Jordan", withOverride(jordan, "MONTHLY", "{name}, {month}:\n{lines}\n= {total}"));

    expect(message.text).toBe(
      "Jordan, Nov 2026:\nRent $950.00\nUtilities bill (1 of 5 shares of $412.30) $82.46\nAircon servicing (1 of 6 units) $18.33\n= $1,050.79",
    );
    expect(message.before).toBe("Jordan, Nov 2026:");
    expect(message.after).toBe("= $1,050.79");
  });

  it("keeps the whole message in before when the template has no {lines}", () => {
    const message = monthly(jordan, "Jordan", withOverride(jordan, "MONTHLY", "Hi {name}, {total} please"));

    expect(message).toMatchObject({ text: "Hi Jordan, $1,050.79 please", before: "Hi Jordan, $1,050.79 please", after: "" });
  });
});

describe("renderNudgeMessage", () => {
  const jordanRent: NudgeCharge = {
    month: "2026-11",
    category: "RENT",
    label: "Rent",
    amountCents: 95000,
    dueDate: new Date("2026-11-01T00:00:00+08:00"),
    payViaPersonId: null,
  };

  it("renders the Brief's Tagalog nudge default", () => {
    expect(
      renderNudgeMessage({ recipientId: jordan, recipientName: "Jordan", config: NOV_2026_CONFIG, charge: jordanRent }),
    ).toBe("Hi Jordan! Paalala lang, yung Rent for Nov 2026 ($950.00) ay due nung 1 Nov. Salamat! 🙏");
  });

  it("uses the recipient's nudge override", () => {
    const config = withOverride(jordan, "NUDGE", "{name}: {charge} {amount}, {dueDate}");

    expect(renderNudgeMessage({ recipientId: jordan, recipientName: "Jordan", config, charge: jordanRent })).toBe(
      "Jordan: Rent $950.00, 1 Nov",
    );
  });

  it("uses the via person's due day for a charge paid through them", () => {
    const samUtilities: NudgeCharge = {
      month: "2026-11",
      category: "UTILITIES",
      label: "Utilities",
      amountCents: 8246,
      dueDate: null,
      payViaPersonId: priya,
    };

    expect(
      renderNudgeMessage({ recipientId: priya, recipientName: "Priya", config: NOV_2026_CONFIG, charge: samUtilities }),
    ).toBe("Hi Priya! Paalala lang, yung Utilities bill for Nov 2026 ($82.46) ay due nung 7 Nov. Salamat! 🙏");
  });
});
