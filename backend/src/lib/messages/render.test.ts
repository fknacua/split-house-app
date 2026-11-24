import type { MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
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

function monthly(recipientId: string, recipientName: string, templates = DEFAULT_MESSAGE_TEMPLATES) {
  return renderMonthlyMessage({
    month: "2026-11",
    recipientId,
    recipientName,
    config: NOV_2026_CONFIG,
    templates,
    billCents: 41230,
    people: PEOPLE,
    charges: NOV_CHARGES,
  });
}

function withOverride(personId: string, kind: "MONTHLY" | "NUDGE", text: string) {
  return { ...DEFAULT_MESSAGE_TEMPLATES, overrides: [{ personId, kind, text }] };
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
    const templates = withOverride(jordan, "MONTHLY", "Hello {name}");

    expect(templateFor(templates, jordan, "MONTHLY")).toBe("Hello {name}");
    expect(templateFor(templates, jordan, "NUDGE")).toBe(DEFAULT_MESSAGE_TEMPLATES.nudge);
    expect(templateFor(templates, priya, "MONTHLY")).toBe(DEFAULT_MESSAGE_TEMPLATES.monthly);
  });
});

describe("lineLabel", () => {
  it("keeps a recurring charge's own label even with a custom recurring label", () => {
    const templates = { ...DEFAULT_MESSAGE_TEMPLATES, lineLabels: { RECURRING: "Internet", AIRCON: "Aircon" } };

    expect(lineLabel(templates, { category: "RECURRING", label: "Starhub" })).toBe("Starhub");
    expect(lineLabel(templates, { category: "AIRCON", label: "Aircon one-off" })).toBe("Aircon");
    expect(lineLabel(templates, { category: "CORRECTION", label: "Correction: September utilities" })).toBe(
      "Correction: September utilities",
    );
  });

  it("names a correction from what it fixes, with the custom line label for utilities and aircon", () => {
    const templates = { ...DEFAULT_MESSAGE_TEMPLATES, lineLabels: { AIRCON: "Aircon" } };
    const fix = (correctsCategory: "UTILITIES" | "AIRCON" | "ONE_OFF", label: string) =>
      lineLabel(templates, { category: "CORRECTION", label, correctsCategory, correctsMonth: "2026-10" });

    expect(fix("UTILITIES", "Utilities correction (Oct)")).toBe("Utilities bill correction (Oct)");
    expect(fix("AIRCON", "Aircon servicing correction (Oct)")).toBe("Aircon correction (Oct)");
    // A one-off's stored label is already its own label and the month.
    expect(fix("ONE_OFF", "Fridge repair correction (Oct)")).toBe("Fridge repair correction (Oct)");
  });
});

describe("renderMonthlyMessage", () => {
  it("renders the Brief's Tagalog default for the primary tenant", () => {
    const message = monthly(priya, "Priya");

    expect(message.text).toBe(
      [
        "Hi Priya! Eto na yung breakdown for Nov 2026 😊",
        "",
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
        "",
        "*Total:* $1,963.65",
        "Paki-send by 7 Nov. Salamat!",
      ].join("\n"),
    );
    expect(message.before).toBe("Hi Priya! Eto na yung breakdown for Nov 2026 😊");
    expect(message.after).toBe("*Total:* $1,963.65\nPaki-send by 7 Nov. Salamat!");
    expect(message.breakdown.totalCents).toBe(196365);
  });

  it("uses the earliest due date among the charges in it", () => {
    expect(monthly(jordan, "Jordan").text).toMatch(/\*Total:\* \$1,050\.79\nPaki-send by 1 Nov\. Salamat!$/);
  });

  it("leaves out the {dueDate} line when nothing in it has a due date", () => {
    const message = renderMonthlyMessage({
      month: "2026-11",
      recipientId: jordan,
      recipientName: "Jordan",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      billCents: 41230,
      people: PEOPLE,
      charges: [{ ...charge(jordan, "CORRECTION", "Correction: September utilities", 1500, null), month: "2026-10" }],
    });

    expect(message.text).toBe(
      "Hi Jordan! Eto na yung breakdown for Nov 2026 😊\n\n*Correction: September utilities:* $15.00\n\n*Total:* $15.00",
    );
    expect(message.after).toBe("*Total:* $15.00");
  });

  it("uses the recipient's override, sending its own bold markers as written", () => {
    const message = monthly(jordan, "Jordan", withOverride(jordan, "MONTHLY", "{name}, {month}:\n{lines}\n= {total}"));

    expect(message.text).toBe(
      "Jordan, Nov 2026:\n*Rent:* $950.00\n*Utilities bill:* $82.46 (total bill $412.30)\n*Aircon servicing:* $18.33 (1/6 units)\n= $1,050.79",
    );
    expect(message.before).toBe("Jordan, Nov 2026:");
    expect(message.after).toBe("= $1,050.79");
  });

  it("keeps the whole message in before when the template has no {lines}", () => {
    const message = monthly(jordan, "Jordan", withOverride(jordan, "MONTHLY", "Hi {name}, {total} please"));

    expect(message).toMatchObject({
      text: "Hi Jordan, $1,050.79 please",
      before: "Hi Jordan, $1,050.79 please",
      after: "",
    });
  });
});

describe("renderNudgeMessage", () => {
  const nudge = (
    recipientId: string,
    recipientName: string,
    charges: NudgeCharge[],
    templates: MessageTemplates = DEFAULT_MESSAGE_TEMPLATES,
  ) =>
    renderNudgeMessage({
      recipientId,
      recipientName,
      month: "2026-11",
      config: NOV_2026_CONFIG,
      templates,
      people: PEOPLE,
      charges,
    });

  const [, , , , samUtilities, , jordanRent, jordanUtilities] = NOV_CHARGES;
  const priyaRent = NOV_CHARGES[0];
  const jordanOctRent = charge(jordan, "RENT", "Rent", 95000, "2026-10-01", { month: "2026-10" });

  it.each([
    {
      name: "one charge: one line and the total",
      charges: [jordanRent],
      text: "Hi Jordan! Paalala lang, overdue pa yung mga ito:\n\n*Rent:* $950.00 (due 1 Nov)\n\n*Total:* $950.00\nSalamat! 🙏",
    },
    {
      name: "several charges: a line each, in breakdown order",
      charges: [jordanUtilities, jordanRent],
      text: "Hi Jordan! Paalala lang, overdue pa yung mga ito:\n\n*Rent:* $950.00 (due 1 Nov)\n*Utilities bill:* $82.46 (due 4 Nov)\n\n*Total:* $1,032.46\nSalamat! 🙏",
    },
    {
      name: "the same label in two months: told apart by the due date",
      charges: [jordanRent, jordanOctRent],
      text: "Hi Jordan! Paalala lang, overdue pa yung mga ito:\n\n*Rent:* $950.00 (due 1 Oct)\n*Rent:* $950.00 (due 1 Nov)\n\n*Total:* $1,900.00\nSalamat! 🙏",
    },
  ])("$name", ({ charges, text }) => {
    expect(nudge(jordan, "Jordan", charges).text).toBe(text);
  });

  it("puts a collected charge in its own section, with subtotals and the via person's due day", () => {
    const message = nudge(priya, "Priya", [samUtilities, priyaRent]);

    expect(message.text).toBe(
      "Hi Priya! Paalala lang, overdue pa yung mga ito:\n\n" +
        "Yours:\n*Rent:* $1,675.00 (due 7 Nov)\n*Subtotal:* $1,675.00\n\n" +
        "Sam’s (please collect):\n*Utilities bill:* $82.46 (due 7 Nov)\n*Subtotal:* $82.46\n\n" +
        "*Total:* $1,757.46\nSalamat! 🙏",
    );
    expect(message.totalCents).toBe(175746);
    expect(message.sections.map((s) => s.title)).toEqual(["Yours:", "Sam’s (please collect):"]);
  });

  it("uses the saved line labels and section titles", () => {
    const templates: MessageTemplates = {
      ...DEFAULT_MESSAGE_TEMPLATES,
      lineLabels: { RENT: "Upa" },
      sectionTitles: { [priya]: { [priya]: "Sa iyo", [sam]: "Kay Sam" } },
    };

    expect(nudge(priya, "Priya", [priyaRent, samUtilities], templates).text).toContain(
      "Sa iyo:\n*Upa:* $1,675.00 (due 7 Nov)\n*Subtotal:* $1,675.00\n\nKay Sam:\n*Utilities bill:* $82.46 (due 7 Nov)",
    );
  });

  it("uses the recipient's nudge override, with the active month", () => {
    const templates = withOverride(jordan, "NUDGE", "{name}, {month}:\n{lines}\n= {total}");

    expect(nudge(jordan, "Jordan", [jordanRent], templates).text).toBe("Jordan, Nov 2026:\n*Rent:* $950.00 (due 1 Nov)\n= $950.00");
  });

  it("leaves the retired placeholders as typed", () => {
    const templates = withOverride(jordan, "NUDGE", "{charge} {amount} {dueDate}");

    expect(nudge(jordan, "Jordan", [jordanRent], templates).text).toBe("{charge} {amount} {dueDate}");
  });

  it("splits the text around {lines} for the preview card", () => {
    expect(nudge(jordan, "Jordan", [jordanRent])).toMatchObject({
      before: "Hi Jordan! Paalala lang, overdue pa yung mga ito:",
      after: "*Total:* $950.00\nSalamat! 🙏",
    });
  });

  it("leaves {lines} and {total} as typed with no charges", () => {
    expect(nudge(jordan, "Jordan", [])).toEqual({
      text: "Hi Jordan! Paalala lang, overdue pa yung mga ito:\n\n{lines}\n\n*Total:* {total}\nSalamat! 🙏",
      before: "Hi Jordan! Paalala lang, overdue pa yung mga ito:\n\n{lines}\n\n*Total:* {total}\nSalamat! 🙏",
      after: "",
      sections: [],
      totalCents: 0,
    });
  });
});
