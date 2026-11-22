import { addChargePreviewSchema, addChargeSheetSchema, type AddChargeValues } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import {
  addChargeProblem,
  buildAddChargeCharges,
  buildAddChargePreview,
  buildAddChargeSheet,
  type AddChargeInput,
} from "./build-add-charge";

const { alex, priya, sam, jordan } = PERSON_IDS;

const INPUT: AddChargeInput = {
  month: "2026-11",
  config: NOV_2026_CONFIG,
  people: [
    { id: alex, name: "Alex", color: "BLUE" },
    { id: priya, name: "Priya", color: "ORANGE" },
    { id: sam, name: "Sam", color: "GREEN" },
    { id: jordan, name: "Jordan", color: "PURPLE" },
  ],
};

const OPENING: AddChargeValues = {
  kind: null,
  label: "",
  amountCents: null,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  dueDate: null,
};

const AIRCON: AddChargeValues = { ...OPENING, kind: "AIRCON", amountCents: 11000, dueDate: "2026-12-05" };
const SHARED: AddChargeValues = { ...OPENING, kind: "ONE_OFF", label: "Fridge repair", amountCents: 12000, dueDate: "2026-12-05" };
const PERSONAL: AddChargeValues = { ...SHARED, label: "Replacement key", amountCents: 820, scope: "PERSONAL", personId: sam };

const preview = (values: AddChargeValues) => addChargePreviewSchema.parse(buildAddChargePreview(INPUT, values));
const rowsOf = (values: AddChargeValues) => preview(values).preview?.rows.map(({ name, basis, value }) => ({ name, basis, value }));
const custom = (amounts: [string, number | null][]): AddChargeValues => ({
  ...SHARED,
  split: "CUSTOM",
  customAmounts: amounts.map(([personId, amountCents]) => ({ personId, amountCents })),
});

describe("buildAddChargeSheet", () => {
  it("opens on the month with nothing picked, Shared and Equal, and the empty preview", () => {
    const sheet = addChargeSheetSchema.parse(buildAddChargeSheet(INPUT));
    expect(sheet).toMatchObject({ month: "2026-11", title: "Add charge", subtitle: "Nov 2026", values: OPENING });
    expect(sheet.what.options.map((o) => o.label)).toEqual(["Aircon servicing", "Other"]);
    expect(sheet.splits.map((o) => o.label)).toEqual(["Equal", "Per share", "Custom"]);
    expect(sheet.preview.preview).toEqual({
      heading: "Split preview",
      empty: "Enter an amount and choose a split to see who pays what.",
      rows: [],
      accessibilityLabel: null,
    });
    expect(sheet.preview.save).toEqual({ label: "Save", enabled: false });
  });

  it("lists everyone but the owner in Who, Sam included though he pays via Priya", () => {
    expect(buildAddChargeSheet(INPUT).who.options).toEqual([
      { personId: priya, name: "Priya" },
      { personId: sam, name: "Sam" },
      { personId: jordan, name: "Jordan" },
    ]);
  });
});

describe("buildAddChargePreview: which fields show", () => {
  it.each([
    ["nothing picked", OPENING, { label: false, scope: false, who: false, split: false }],
    ["aircon", AIRCON, { label: false, scope: false, who: false, split: false }],
    ["shared Other", SHARED, { label: true, scope: true, who: false, split: true }],
    ["personal Other", PERSONAL, { label: true, scope: true, who: true, split: false }],
  ])("%s", (_name, values, show) => {
    expect(preview(values).show).toEqual(show);
  });
});

describe("buildAddChargePreview: the split preview", () => {
  it("splits aircon by units, with each person's units and Sam's route", () => {
    const result = preview(AIRCON);
    expect(result.preview?.heading).toBe("Split by aircon units");
    expect(rowsOf(AIRCON)).toEqual([
      { name: "You", basis: "2 units", value: "$36.67" },
      { name: "Priya", basis: "2 units", value: "$36.67" },
      { name: "Sam", basis: "1 unit · via Priya", value: "$18.33" },
      { name: "Jordan", basis: "1 unit", value: "$18.33" },
    ]);
    expect(result.preview?.accessibilityLabel).toBe("Split by aircon units: You $36.67, Priya $36.67, Sam $18.33, Jordan $18.33");
  });

  it("splits Equal with only the route under a name", () => {
    expect(rowsOf(SHARED)).toEqual([
      { name: "You", basis: null, value: "$30.00" },
      { name: "Priya", basis: null, value: "$30.00" },
      { name: "Sam", basis: "via Priya", value: "$30.00" },
      { name: "Jordan", basis: null, value: "$30.00" },
    ]);
  });

  it("splits Per share with the owner and primary tenant's part of the rest as shares", () => {
    expect(rowsOf({ ...SHARED, split: "PER_SHARE" })).toEqual([
      { name: "You", basis: "1.5 shares", value: "$36.00" },
      { name: "Priya", basis: "1.5 shares", value: "$36.00" },
      { name: "Sam", basis: "1 share · via Priya", value: "$24.00" },
      { name: "Jordan", basis: "1 share", value: "$24.00" },
    ]);
  });

  it("gives each row its person's color and part of the bar", () => {
    const rows = preview({ ...SHARED, split: "PER_SHARE" }).preview?.rows ?? [];
    expect(rows.map((r) => [r.color, r.percent])).toEqual([
      ["BLUE", 30],
      ["ORANGE", 30],
      ["GREEN", 20],
      ["PURPLE", 20],
    ]);
  });

  it("shows the split before the label and due date are filled", () => {
    expect(rowsOf({ ...SHARED, label: "", dueDate: null })).toHaveLength(4);
  });

  it.each([null, 0, -500])("stays empty with the amount at %s", (amountCents) => {
    expect(preview({ ...SHARED, amountCents }).preview?.empty).not.toBeNull();
  });

  it.each([
    ["Personal", PERSONAL],
    ["Custom", custom([])],
  ])("has no preview for %s", (_name, values) => {
    expect(preview(values).preview).toBeNull();
  });
});

describe("buildAddChargePreview: Custom", () => {
  it("lists a field for everyone, the owner included, with Sam's route", () => {
    expect(preview(custom([])).custom?.rows.map((r) => r.label)).toEqual(["You", "Priya", "Sam · via Priya", "Jordan"]);
  });

  it.each([
    ["left to split", [[alex, 3000], [priya, 3000], [sam, 2000], [jordan, 2000]], "$20.00 left to split"],
    ["over the total", [[alex, 4000], [priya, 3000], [sam, 3000], [jordan, 3000]], "$10.00 over the total"],
    ["adding up", [[alex, 3000], [priya, 3000], [sam, 3000], [jordan, 3000]], null],
    ["an empty field counted as $0", [[alex, 12000], [priya, null]], null],
  ] as [string, [string, number | null][], string | null][])("warns with %s", (_name, amounts, alert) => {
    expect(preview(custom(amounts)).custom?.alert).toBe(alert);
  });

  it("has no Alert while there is no total", () => {
    expect(preview({ ...custom([[alex, 100]]), amountCents: null }).custom?.alert).toBeNull();
  });

  it("enables Save only once the amounts add up, naming the total either way", () => {
    expect(preview(custom([[alex, 100]])).save).toEqual({ label: "Save $120.00", enabled: false });
    expect(preview(custom([[alex, 6000], [priya, 6000]])).save).toEqual({ label: "Save $120.00", enabled: true });
  });

  it("refuses a negative amount even when the total adds up", () => {
    expect(preview(custom([[alex, 13000], [priya, -1000]])).save.enabled).toBe(false);
  });

  it("ignores amounts for someone not in the household", () => {
    expect(preview(custom([[alex, 12000], ["person-nobody", 500]])).save.enabled).toBe(true);
  });
});

describe("buildAddChargePreview: Save", () => {
  it.each([
    ["nothing picked", { ...SHARED, kind: null }],
    ["no amount", { ...SHARED, amountCents: null }],
    ["a $0 amount", { ...SHARED, amountCents: 0 }],
    ["no due date", { ...SHARED, dueDate: null }],
    ["a blank label", { ...SHARED, label: "   " }],
    ["nobody picked for Personal", { ...PERSONAL, personId: null }],
    ["the owner picked for Personal", { ...PERSONAL, personId: alex }],
    ["someone not in the household", { ...PERSONAL, personId: "person-nobody" }],
  ] as [string, AddChargeValues][])("stays disabled with %s", (_name, values) => {
    const result = preview(values);
    expect(result.save.enabled).toBe(false);
    expect(result.confirm).toBeNull();
  });

  it("needs no label for aircon", () => {
    expect(preview({ ...AIRCON, label: "" }).save).toEqual({ label: "Save $110.00", enabled: true });
  });

  it("reads plain Save with no amount", () => {
    expect(preview({ ...SHARED, amountCents: null }).save.label).toBe("Save");
  });
});

describe("buildAddChargePreview: the confirm dialog", () => {
  it("shows aircon with its split collapsed under Split per person", () => {
    expect(preview(AIRCON).confirm).toEqual({
      title: "Add this charge?",
      rows: [
        { label: "What it’s for", value: "Aircon servicing", items: null },
        { label: "Amount", value: "$110.00", items: null },
        {
          label: "Split per person",
          value: "Per unit · 4 people",
          items: [
            { label: "You", value: "$36.67" },
            { label: "Priya", value: "$36.67" },
            { label: "Sam", value: "$18.33" },
            { label: "Jordan", value: "$18.33" },
          ],
        },
        { label: "Due date", value: "5 Dec 2026", items: null },
      ],
      confirmLabel: "Add $110.00",
      cancelLabel: "Go back",
    });
  });

  it.each([
    ["EQUAL", "Equal · 4 people"],
    ["PER_SHARE", "Per share · 4 people"],
  ] as const)("names the %s split", (split, value) => {
    expect(preview({ ...SHARED, split }).confirm?.rows[2]).toMatchObject({ label: "Split per person", value });
  });

  it("counts only the people with an amount in a Custom split", () => {
    expect(preview(custom([[alex, 6000], [priya, 6000]])).confirm?.rows[2].value).toBe("Custom · 2 people");
  });

  it("shows the typed label, trimmed", () => {
    expect(preview({ ...SHARED, label: "  Fridge repair " }).confirm?.rows[0].value).toBe("Fridge repair");
  });

  it("shows Personal's Who with the route instead of a split", () => {
    expect(preview(PERSONAL).confirm?.rows).toEqual([
      { label: "What it’s for", value: "Replacement key", items: null },
      { label: "Amount", value: "$8.20", items: null },
      { label: "Who", value: "Sam · via Priya", items: null },
      { label: "Due date", value: "5 Dec 2026", items: null },
    ]);
  });
});

describe("buildAddChargeCharges", () => {
  it("makes one ONE_OFF charge per person for a shared Other, on the one due date", () => {
    const charges = buildAddChargeCharges(INPUT, SHARED) ?? [];
    expect(charges).toHaveLength(4);
    expect(charges.every((c) => c.category === "ONE_OFF" && c.label === "Fridge repair" && c.dueDate === "2026-12-05")).toBe(true);
  });

  it("stores aircon under Aircon servicing, whatever the label field holds", () => {
    expect(buildAddChargeCharges(INPUT, { ...AIRCON, label: "Ignored" })?.every((c) => c.label === "Aircon servicing")).toBe(true);
  });

  it("makes one routed charge for Personal", () => {
    expect(buildAddChargeCharges(INPUT, PERSONAL)).toEqual([
      { personId: sam, category: "ONE_OFF", label: "Replacement key", amountCents: 820, payViaPersonId: priya, dueDate: "2026-12-05" },
    ]);
  });

  it("makes nothing without a due date", () => {
    expect(buildAddChargeCharges(INPUT, { ...AIRCON, dueDate: null })).toBeNull();
  });
});

describe("addChargeProblem", () => {
  it.each([
    ["nothing picked", { ...SHARED, kind: null }, 422, "no_kind"],
    ["a blank label", { ...SHARED, label: "  " }, 422, "no_label"],
    ["no amount", { ...SHARED, amountCents: null }, 422, "no_amount"],
    ["a $0 amount", { ...SHARED, amountCents: 0 }, 422, "no_amount"],
    ["nobody picked for Personal", { ...PERSONAL, personId: null }, 422, "no_who"],
    ["the owner picked for Personal", { ...PERSONAL, personId: alex }, 404, "no_person"],
    ["someone not in the household", { ...PERSONAL, personId: "person-nobody" }, 404, "no_person"],
    ["no due date", { ...SHARED, dueDate: null }, 422, "no_date"],
    ["Custom amounts that don't add up", custom([[alex, 100]]), 422, "split_mismatch"],
    ["a negative Custom amount", custom([[alex, 13000], [priya, -1000]]), 422, "split_mismatch"],
  ] as [string, AddChargeValues, number, string][])("refuses %s", (_name, values, status, code) => {
    expect(addChargeProblem(INPUT, values)).toMatchObject({ status, code });
  });

  it("says how far off Custom is", () => {
    expect(addChargeProblem(INPUT, custom([[alex, 10000]]))?.message).toBe("The amounts don’t add up: $20.00 left to split.");
  });

  it("checks in the sheet's order, the label before the amount", () => {
    expect(addChargeProblem(INPUT, { ...SHARED, label: "", amountCents: null, dueDate: null })?.code).toBe("no_label");
  });

  it.each([
    ["aircon with no label", { ...AIRCON, label: "" }],
    ["a shared Other", SHARED],
    ["Personal", PERSONAL],
    ["Custom adding up", custom([[alex, 6000], [priya, 6000]])],
  ] as [string, AddChargeValues][])("passes %s", (_name, values) => {
    expect(addChargeProblem(INPUT, values)).toBeNull();
  });
});

describe("buildAddChargeCharges with a line label", () => {
  it("stores aircon under the label given", () => {
    expect(buildAddChargeCharges(INPUT, AIRCON, "Aircon")?.every((c) => c.label === "Aircon")).toBe(true);
  });
});
