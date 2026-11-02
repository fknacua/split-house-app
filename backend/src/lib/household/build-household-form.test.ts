import { householdFormResponseSchema, type PersonColor } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildHouseholdForm, startsFromMonths } from "./build-household-form";

const PEOPLE: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[] = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6590000001", color: "BLUE", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6590000003", color: "GREEN", isOwner: false },
];

const form = (personId: string, month = "2027-01") =>
  buildHouseholdForm({
    month,
    startsFromOptions: ["2026-12", "2027-01"],
    config: NOV_2026_CONFIG,
    personId,
    people: PEOPLE,
  });

describe("startsFromMonths", () => {
  it("offers the 12 months after the active one", () => {
    const months = startsFromMonths("2026-11", ["2026-08", "2026-11"]);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-12");
    expect(months.at(-1)).toBe("2027-11");
  });

  it("keeps an upcoming version further out", () => {
    expect(startsFromMonths("2026-11", ["2028-06"]).at(-1)).toBe("2028-06");
  });
});

describe("buildHouseholdForm", () => {
  it("gives a tenant their values, text and the link to remove them", () => {
    const body = householdFormResponseSchema.parse(form(PERSON_IDS.jordan));
    expect(body.title).toBe("Edit Jordan");
    expect(body.viewTitle).toBe("Jordan");
    expect(body.sub).toBe("Own room · pays you directly");
    expect(body.values.amounts).toEqual({ rentCents: 95000, utilityShares: 1000, airconUnits: 1, depositCents: 95000 });
    expect(body.values).toMatchObject({ rentDueDay: 1, utilitiesDueDay: 4, rentViaPersonId: null });
    expect(body.view.amounts).toEqual([
      { label: "Rent (SGD)", value: "950.00" },
      { label: "Rent due", value: "1st" },
      { label: "Utility shares", value: "1" },
      { label: "Utilities due", value: "4th" },
      { label: "Aircon units", value: "1" },
      { label: "Deposit held (SGD)", value: "950.00" },
    ]);
    expect(body.secondaryAction).toEqual({ label: "Remove from household", kind: "remove-person" });
  });

  it("shows an em dash for no number, None for no deposit and the route as text", () => {
    const { view, values } = form(PERSON_IDS.sam);
    expect(view.details[1]).toEqual({ label: "WhatsApp", value: "—" });
    expect(view.amounts.at(-1)?.value).toBe("None");
    expect(view.amounts[3]).toEqual({ label: "Utilities due", value: "—" });
    expect(view.routes).toEqual([
      { label: "Rent paid", value: "Directly" },
      { label: "Utilities paid", value: "Via Priya" },
    ]);
    expect(values.utilitiesViaPersonId).toBe(PERSON_IDS.priya);
  });

  it("gives the primary tenant no amounts and a Cancel link", () => {
    const body = form(PERSON_IDS.priya);
    expect(body.values.amounts).toBeNull();
    expect(body.view.amounts.map((r) => r.label)).toEqual(["Rent due", "Utilities due"]);
    expect(body.secondaryAction).toEqual({ label: "Cancel", kind: "cancel" });
  });

  it("offers eight colors without Teal, and the selected one's name", () => {
    const body = form(PERSON_IDS.jordan);
    expect(body.colorName).toBe("Green");
    expect(body.swatches).toHaveLength(8);
    expect(body.swatches.some((s) => s.color === "TEAL")).toBe(false);
    expect(body.swatches[0]).toEqual({ color: "BLUE", name: "Blue" });
  });

  it("offers everyone else but the owner as Sent via", () => {
    expect(form(PERSON_IDS.jordan).sentViaOptions).toEqual([
      { personId: PERSON_IDS.priya, name: "Priya" },
      { personId: PERSON_IDS.sam, name: "Sam" },
    ]);
  });

  it("selects the month when it is an option, otherwise the first option", () => {
    expect(form(PERSON_IDS.jordan, "2027-01").startsFrom).toBe("2027-01");
    expect(form(PERSON_IDS.jordan, "2026-11").startsFrom).toBe("2026-12");
  });
});
