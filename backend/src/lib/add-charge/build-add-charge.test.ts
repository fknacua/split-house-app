import { addChargePreviewSchema, addChargeSheetSchema, type AddChargeValues } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { CORRECTABLE_CHARGES } from "@/lib/fixtures/correctable-charges";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import {
  addChargeProblem,
  buildAddChargeCharges,
  buildAddChargePreview,
  buildAddChargeSheet,
} from "./build-add-charge";
import { findCorrectable, type CorrectionInput } from "./build-correction";

const { alex, priya, sam, jordan } = PERSON_IDS;

const INPUT: CorrectionInput = {
  month: "2026-11",
  config: NOV_2026_CONFIG,
  people: [
    { id: alex, name: "Alex", color: "BLUE" },
    { id: priya, name: "Priya", color: "ORANGE" },
    { id: sam, name: "Sam", color: "GREEN" },
    { id: jordan, name: "Jordan", color: "PURPLE" },
  ],
  today: "2026-11-24",
  charges: CORRECTABLE_CHARGES,
};

const OPENING: AddChargeValues = {
  mode: "CHARGE",
  correction: { personId: null, month: null, chargeId: null, amountCents: null, dueDate: "2026-11-24" },
  kind: null,
  label: "",
  amountCents: null,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  shares: [],
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

  it("offers the Charge | Correction group and Correction mode's unlocked Selects", () => {
    const sheet = buildAddChargeSheet(INPUT);
    expect(sheet.modes).toEqual({
      label: "Add as",
      options: [
        { value: "CHARGE", label: "Charge" },
        { value: "CORRECTION", label: "Correction" },
      ],
    });
    expect(sheet.correction).toMatchObject({
      locked: false,
      person: { placeholder: "Select person" },
      month: { placeholder: "Select month" },
      charge: { placeholder: "Select charge" },
    });
    expect(sheet.correction.people.map((p) => p.name)).toEqual(["Sam", "Jordan"]);
    expect(sheet.preview.correction).toBeNull();
  });

  it("opened from a charge: Add correction, no group, the charge picked and locked, and its preview", () => {
    const sheet = addChargeSheetSchema.parse(buildAddChargeSheet(INPUT, findCorrectable(INPUT, "oct-utilities-jordan")));
    expect(sheet).toMatchObject({ title: "Add correction", subtitle: "Nov 2026", modes: null, correction: { locked: true } });
    expect(sheet.values).toEqual({
      ...OPENING,
      mode: "CORRECTION",
      correction: { personId: jordan, month: "2026-10", chargeId: "oct-utilities-jordan", amountCents: null, dueDate: "2026-11-24" },
    });
    expect(sheet.preview.correction).toEqual({
      current: "Currently $77.46 · after 1 correction",
      outcome: null,
      amountEnabled: true,
      dueDateEnabled: false,
    });
    expect(sheet.preview.save).toEqual({ label: "Save", enabled: false });
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

  it("has no preview for Personal", () => {
    expect(preview(PERSONAL).preview).toBeNull();
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
      body: null,
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

describe("buildAddChargePreview: Custom starts from Equal", () => {
  const thousand = (values: Partial<AddChargeValues> = {}): AddChargeValues => ({
    ...SHARED,
    amountCents: 100000,
    split: "CUSTOM",
    ...values,
  });

  it("fills every field with the Equal split while nothing is typed: $1,000 is $250 each", () => {
    const result = preview(thousand());
    expect(result.custom?.rows.map((r) => r.amountCents)).toEqual([25000, 25000, 25000, 25000]);
    expect(result.custom?.alert).toBeNull();
    expect(result.save.enabled).toBe(true);
  });

  it("follows the amount until a field is typed in", () => {
    expect(preview(thousand({ amountCents: 10001 })).custom?.rows.map((r) => r.amountCents)).toEqual([2501, 2500, 2500, 2500]);
  });

  it("has empty fields while there is no amount", () => {
    expect(preview(thousand({ amountCents: null })).custom?.rows.map((r) => r.amountCents)).toEqual([null, null, null, null]);
  });

  it("keeps the typed amounts once one is typed, the rest showing empty", () => {
    const rows = preview(thousand({ customAmounts: [{ personId: sam, amountCents: 10000 }] })).custom?.rows;
    expect(rows?.map((r) => r.amountCents)).toEqual([null, null, 10000, null]);
  });

  it("previews the typed amounts even while they don't add up, the bar measured against their sum", () => {
    const values = thousand({
      customAmounts: [
        { personId: alex, amountCents: 30000 },
        { personId: priya, amountCents: 30000 },
        { personId: sam, amountCents: 20000 },
        { personId: jordan, amountCents: 0 },
      ],
    });
    const result = preview(values);
    expect(result.custom?.alert).toBe("$200.00 left to split");
    expect(result.preview?.rows.map((r) => [r.name, r.basis, r.value, r.percent])).toEqual([
      ["You", null, "$300.00", 37.5],
      ["Priya", null, "$300.00", 37.5],
      ["Sam", "via Priya", "$200.00", 25],
    ]);
  });

  it("saves the Equal split when Custom is picked and nothing typed", () => {
    expect(buildAddChargeCharges(INPUT, thousand())?.map((c) => c.amountCents)).toEqual([25000, 25000, 25000, 25000]);
  });
});

describe("buildAddChargePreview: Per share", () => {
  const perShare = (shares: [string, number | null][] = []): AddChargeValues => ({
    ...SHARED,
    split: "PER_SHARE",
    shares: shares.map(([personId, value]) => ({ personId, shares: value })),
  });

  it("starts from the household's shares, labelled with each route", () => {
    expect(preview(perShare()).shares).toEqual({
      heading: "Shares",
      rows: [
        { personId: alex, label: "You", shares: 1500 },
        { personId: priya, label: "Priya", shares: 1500 },
        { personId: sam, label: "Sam · via Priya", shares: 1000 },
        { personId: jordan, label: "Jordan", shares: 1000 },
      ],
      alert: null,
    });
  });

  it("splits by changed shares, for this charge only", () => {
    const values = perShare([[alex, 1000], [priya, 2000], [sam, 0], [jordan, 1000]]);
    expect(rowsOf(values)).toEqual([
      { name: "You", basis: "1 share", value: "$30.00" },
      { name: "Priya", basis: "2 shares", value: "$60.00" },
      { name: "Jordan", basis: "1 share", value: "$30.00" },
    ]);
    expect(preview(values).confirm?.rows[2].value).toBe("Per share · 3 people");
  });

  it("counts an empty share field as 0", () => {
    expect(rowsOf(perShare([[alex, 1000], [priya, null], [sam, null], [jordan, 1000]]))).toHaveLength(2);
  });

  it.each([
    ["every share at 0", [[alex, 0], [priya, 0], [sam, 0], [jordan, 0]]],
    ["a share below 0", [[alex, 2000], [priya, -1000], [sam, 0], [jordan, 0]]],
  ] as [string, [string, number | null][]][])("warns and disables Save with %s", (_name, shares) => {
    const result = preview(perShare(shares));
    expect(result.shares?.alert).toBe("Give at least one person a share above 0.");
    expect(result.save.enabled).toBe(false);
    expect(addChargeProblem(INPUT, perShare(shares))).toMatchObject({ status: 422, code: "no_shares" });
  });

  it("has no share fields for the other splits", () => {
    expect(preview(SHARED).shares).toBeNull();
  });
});

describe("the preview's colors", () => {
  it("gives each row its person's color, as the dots before the names use", () => {
    expect(preview(SHARED).preview?.rows.map((r) => r.color)).toEqual(["BLUE", "ORANGE", "GREEN", "PURPLE"]);
  });
});
